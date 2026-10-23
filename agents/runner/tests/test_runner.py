import unittest
import json
import tempfile
import shutil
import importlib.util
import os
import sys
import types
from unittest.mock import patch
from pathlib import Path

from pydantic import ValidationError

from wallet_agents.contracts import GeneratedFile, StageOutput
from wallet_agents.artifacts import ArtifactStore, RunnerError, confined
from wallet_agents.crew import PRINCIPAL_ROLES, SpecialistRegistry, build_llm
from wallet_agents.flow import AUTHORS, REQUIRED, REVIEWERS, WalletOrchestrationFlow
from wallet_agents.crew import DefinitionCrewFactory
from wallet_agents.artifacts import write_json
from wallet_agents.copilot_llm import _format_messages, create_copilot_llm


class ContractTests(unittest.TestCase):
    def test_rejects_unsafe_paths(self):
        for path in ("../secret", "/etc/passwd", "C:/keys", "a\\b", ".env", "a/../b"):
            with self.subTest(path=path), self.assertRaises(ValidationError):
                GeneratedFile(path=path, content="not written")

    def test_rejects_duplicate_outputs_and_unknown_fields(self):
        with self.assertRaises(ValidationError):
            StageOutput(
                summary="draft",
                covered_criteria=["CA1"],
                files=[{"path": "proposal.md", "content": "one"}] * 2,
            )
        with self.assertRaises(ValidationError):
            GeneratedFile(path="proposal.md", content="draft", approved=True)


class CopilotProviderTests(unittest.TestCase):
    def policy(self, **updates):
        from wallet_agents.contracts import RuntimePolicy

        values = {
            "provider": "copilot_sdk",
            "model": "gpt-test",
            "copilot_personal_use_approved": True,
            "max_calls": 2,
            "max_output_tokens": 100,
            "max_context_bytes": 1000,
            "max_seconds": 30,
            "max_corrections": 0,
            "approved_profiles": sorted(PRINCIPAL_ROLES),
        }
        values.update(updates)
        return RuntimePolicy(**values)

    def test_copilot_requires_q15_approval_and_no_base_url(self):
        from wallet_agents.contracts import RuntimePolicy

        with self.assertRaises(ValidationError):
            self.policy(copilot_personal_use_approved=False)
        with self.assertRaises(ValidationError):
            self.policy(base_url="https://example.invalid")
        with self.assertRaises(ValidationError):
            RuntimePolicy(
                provider="openai_compatible",
                model="offline-fixture",
                copilot_personal_use_approved=True,
                max_calls=1,
                max_output_tokens=10,
                max_context_bytes=100,
                max_seconds=10,
                max_corrections=0,
                approved_profiles=sorted(PRINCIPAL_ROLES),
            )

    def test_provider_routes_to_copilot_adapter(self):
        expected = object()
        with patch("wallet_agents.copilot_llm.create_copilot_llm", return_value=expected) as create:
            self.assertIs(build_llm(self.policy(), timeout=12), expected)
        create.assert_called_once_with("gpt-test", 12)

    def test_formats_role_messages_and_rejects_non_text(self):
        self.assertEqual(
            _format_messages([{"role": "system", "content": "rules"}, {"role": "user", "content": "task"}]),
            "[SYSTEM]\nrules\n\n[USER]\ntask",
        )
        with self.assertRaises(RunnerError):
            _format_messages([{"role": "user", "content": [{"type": "image"}]}])

    def test_sdk_call_is_isolated_tool_free_and_cleans_up(self):
        records = {}

        class FakeBaseLLM:
            def __init__(self, model, temperature):
                self.model = model
                self.temperature = temperature

        class FakeReject:
            def __init__(self, feedback):
                self.feedback = feedback

        class FakeSession:
            session_id = "synthetic-session"

            async def __aenter__(self):
                return self

            async def __aexit__(self, *args):
                records["session_closed"] = True

            async def send_and_wait(self, prompt, timeout):
                records["prompt"] = prompt
                records["timeout"] = timeout
                return types.SimpleNamespace(data=types.SimpleNamespace(content="synthetic answer"))

        class FakeClient:
            def __init__(self, **options):
                records["client_config"] = options

            async def __aenter__(self):
                return self

            async def __aexit__(self, *args):
                records["client_closed"] = True

            async def create_session(self, **config):
                records["session_config"] = config
                records["permission_rejection"] = config["on_permission_request"](None, None)
                return FakeSession()

            async def delete_session(self, session_id):
                records["deleted_session"] = session_id

        crewai_module = types.ModuleType("crewai")
        crewai_module.BaseLLM = FakeBaseLLM
        copilot_module = types.ModuleType("copilot")
        copilot_module.__path__ = []
        copilot_module.CopilotClient = FakeClient
        generated_module = types.ModuleType("copilot.generated")
        generated_module.__path__ = []
        rpc_module = types.ModuleType("copilot.generated.rpc")
        rpc_module.PermissionDecisionReject = FakeReject

        with patch.dict(sys.modules, {
            "crewai": crewai_module,
            "copilot": copilot_module,
            "copilot.generated": generated_module,
            "copilot.generated.rpc": rpc_module,
        }), patch.dict(os.environ, {
            "COPILOT_USE_LOGGED_IN_USER": "false",
            "COPILOT_GITHUB_TOKEN": "test-token",
        }):
            llm = create_copilot_llm(model="gpt-test", timeout=12)
            self.assertEqual(
                llm.call([{"role": "user", "content": "synthetic prompt"}]),
                "synthetic answer",
            )

        self.assertEqual(records["client_config"], {
            "github_token": "test-token",
            "use_logged_in_user": False,
        })
        self.assertEqual(records["session_config"]["model"], "gpt-test")
        self.assertEqual(records["session_config"]["tools"], [])
        self.assertEqual(records["session_config"]["available_tools"], [])
        self.assertFalse(records["session_config"]["enable_config_discovery"])
        self.assertFalse(records["session_config"]["enable_skills"])
        self.assertFalse(records["session_config"]["enable_session_store"])
        self.assertFalse(records["session_config"]["enable_session_telemetry"])
        self.assertFalse(records["session_config"]["enable_host_git_operations"])
        self.assertEqual(
            records["permission_rejection"].feedback,
            "Tool use is disabled for CrewAI LLM requests",
        )
        self.assertEqual(records["timeout"], 12)
        self.assertTrue(records["session_closed"])
        self.assertTrue(records["client_closed"])
        self.assertEqual(records["deleted_session"], "synthetic-session")

    def test_missing_explicit_token_fails_without_fallback(self):
        class FakeBaseLLM:
            def __init__(self, model, temperature):
                self.model = model

        class FakeClient:
            def __init__(self, **options):
                raise AssertionError("Client must not start without an explicit token")

        class FakeReject:
            def __init__(self, feedback):
                self.feedback = feedback

        crewai_module = types.ModuleType("crewai")
        crewai_module.BaseLLM = FakeBaseLLM
        copilot_module = types.ModuleType("copilot")
        copilot_module.__path__ = []
        copilot_module.CopilotClient = FakeClient
        generated_module = types.ModuleType("copilot.generated")
        generated_module.__path__ = []
        rpc_module = types.ModuleType("copilot.generated.rpc")
        rpc_module.PermissionDecisionReject = FakeReject

        with patch.dict(sys.modules, {
            "crewai": crewai_module,
            "copilot": copilot_module,
            "copilot.generated": generated_module,
            "copilot.generated.rpc": rpc_module,
        }), patch.dict(os.environ, {"COPILOT_USE_LOGGED_IN_USER": "false"}):
            os.environ.pop("COPILOT_GITHUB_TOKEN", None)
            with self.assertRaisesRegex(RunnerError, "COPILOT_GITHUB_TOKEN"):
                create_copilot_llm(model="gpt-test", timeout=12).call("synthetic prompt")

    def test_logged_in_user_is_default_and_ignores_ambient_tokens(self):
        from wallet_agents.copilot_llm import client_options

        ambient = {"PATH": "synthetic-path", "COPILOT_GITHUB_TOKEN": "a", "GH_TOKEN": "b", "GITHUB_TOKEN": "c"}
        with patch.dict(os.environ, ambient, clear=True):
            options = client_options()
        self.assertTrue(options["use_logged_in_user"])
        self.assertNotIn("github_token", options)
        self.assertEqual(options["env"], {"PATH": "synthetic-path"})
        for value, expected in (("1", True), ("yes", True), ("S", True), ("false", False), ("0", False), ("maybe", False)):
            with self.subTest(value=value), patch.dict(os.environ, {"COPILOT_USE_LOGGED_IN_USER": value, "COPILOT_GITHUB_TOKEN": "t"}):
                self.assertEqual(client_options()["use_logged_in_user"], expected)


class StoreTests(unittest.TestCase):
    def test_approval_is_signed_revision_bound_and_revocable(self):
        with tempfile.TemporaryDirectory() as directory:
            store = ArtifactStore(Path(directory) / "out", Path(directory) / "control")
            store.key(create=True)
            runner_store = ArtifactStore(store.output, store.control, Path(directory) / "unmounted/operator.key")
            state = {"run_id": "test", "gate": "G0"}
            with self.assertRaises(RunnerError):
                store.require_approval("test", "G0", "revision")
            store.approve(state, "revision", "operator")
            self.assertEqual(store.require_approval("test", "G0", "revision")["reviewer"], "operator")
            with self.assertRaises(RunnerError):
                store.require_approval("test", "G0", "changed")
            record = store.sign({"run_id": "test"})
            self.assertEqual(runner_store.verified(record), {"run_id": "test"})
            with self.assertRaises(RunnerError):
                runner_store.sign({"run_id": "forbidden"})
            record["payload"]["run_id"] = "forged"
            with self.assertRaises(RunnerError):
                store.verified(record)
            store.revoke("test", "G0")
            with self.assertRaises(RunnerError):
                store.require_approval("test", "G0", "revision")
            store.approve(state, "revision", "operator")
            expired = store.require_approval("test", "G0", "revision")
            expired["expires"] = "2000-01-01T00:00:00+00:00"
            write_json(store.control, "approvals/test/G0.json", store.sign(expired))
            with self.assertRaises(RunnerError):
                store.require_approval("test", "G0", "revision")

    def test_symlinks_and_overlapping_volumes_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "link").symlink_to("/tmp")
            with self.assertRaises(RunnerError):
                confined(root, "link/secret")
            with self.assertRaises(RunnerError):
                ArtifactStore(root, root / "control")


def configured_fixture(directory: str) -> Path:
    """Copy the real profiles/skills, marking drafts as reviewed only in the temporary copy."""
    repository = Path("/repository")
    fixture = Path(directory)
    shutil.copytree(repository / "agents", fixture / "agents", ignore=shutil.ignore_patterns("runner", "runs"))
    for relative in ("AGENTS.md", "architecture/README.md", "docs/requirements/open-questions.md"):
        target = fixture / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(repository / relative, target)
    for profile in (fixture / "agents/specialists").glob("*.md"):
        text = profile.read_text().replace("status: draft", "status: configured").replace("[ ]", "[x]")
        profile.write_text(text)
    return fixture


class RegistryTests(unittest.TestCase):
    def test_draft_profiles_in_the_real_repository_are_rejected(self):
        if not Path("/repository").exists():
            self.skipTest("Repository fixture mount is required")
        drafts = [path.name for path in Path("/repository/agents/specialists").glob("*.md")
                  if "status: draft" in path.read_text()]
        if not drafts:
            self.skipTest("All specialist profiles are reviewed")
        with self.assertRaises(RunnerError):
            SpecialistRegistry(Path("/repository"))

    def test_existing_profiles_are_actually_loaded_and_revision_bound(self):
        if not Path("/repository").exists():
            self.skipTest("Repository fixture mount is required")
        with tempfile.TemporaryDirectory() as directory:
            fixture = configured_fixture(directory)
            registry = SpecialistRegistry(fixture)
            self.assertTrue(PRINCIPAL_ROLES.issubset(registry.instructions))
            self.assertIn("# Arquitecto", registry.instructions["solution_architect"])
            profile = fixture / "agents/specialists/architect.md"
            profile.write_text(profile.read_text() + "\nAdditional reviewed instruction.\n")
            self.assertNotEqual(registry.revision, SpecialistRegistry(fixture).revision)
            profile.write_text(profile.read_text().replace("status: configured", "status: draft"))
            with self.assertRaises(RunnerError):
                SpecialistRegistry(fixture)


class GateFlowTests(unittest.TestCase):
    def test_stories_are_discovered_from_the_input_folder(self):
        from wallet_agents.flow import discover_stories
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            body = "# Title\n\n## Criterios de aceptación\n\n1. a\n2. b\n\n## Contexto\n"
            for name in ("payment-idempotency-protection.sp.md", "merchant-qr-payment-status-visibility.sp.md",
                         "unknown-story.sp.md", "user-onboarding-mvp-completion.sp.md"):
                (folder / name).write_text(body, encoding="utf-8")
            found = {item["file"]: item for item in discover_stories(folder)}
            self.assertFalse(found["payment-idempotency-protection.sp.md"]["selectable"])
            self.assertIn("espera 4", found["payment-idempotency-protection.sp.md"]["note"])
            self.assertEqual(found["merchant-qr-payment-status-visibility.sp.md"]["story_id"], "HU-03")
            self.assertFalse(found["merchant-qr-payment-status-visibility.sp.md"]["selectable"])
            self.assertIsNone(found["unknown-story.sp.md"]["story_id"])
            self.assertEqual(len(found), 4)
            self.assertEqual(discover_stories(folder)[0]["story_id"], "HU-01")

    def test_start_and_resume_without_g0_never_invoke_models(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            stories = root / "stories"
            stories.mkdir()
            (stories / "user-onboarding-mvp-completion.sp.md").write_text("HU-01 CA1 CA2 CA3 CA4 CA5 CA6")
            flow = WalletOrchestrationFlow.__new__(WalletOrchestrationFlow)
            flow.repository = root
            flow.store = ArtifactStore(root / "out", root / "control")
            flow.store.key(create=True)
            flow.registry = type("Registry", (), {"revision": "fixed"})()
            flow.executor = type("ForbiddenExecutor", (), {"invoke": lambda *args: self.fail("Model invoked before G0")})()
            from wallet_agents.contracts import RuntimePolicy
            policy = RuntimePolicy(model="offline-fixture", max_calls=5, max_output_tokens=1000,
                max_context_bytes=10000, max_seconds=60, max_corrections=1,
                approved_profiles=sorted(PRINCIPAL_ROLES))
            placeholder = policy.model_copy(update={"model": "REPLACE_WITH_APPROVED_PROVIDER_MODEL"})
            with self.assertRaises(RunnerError):
                flow.start("placeholder", stories, None, placeholder, ["HU-01"])
            for invalid in ([], ["HU-03"], ["HU-02"], ["HU-01", "HU-01"]):
                with self.subTest(selection=invalid), self.assertRaises(RunnerError):
                    flow.start("invalid-selection", stories, None, policy, invalid)
            state = flow.start("fixture", stories, None, policy, ["HU-01"])
            self.assertEqual(state["gate"], "G0")
            self.assertEqual(flow.resume("fixture")["calls"], 0)
            from wallet_agents.main import check_request
            with self.assertRaises(RunnerError):
                check_request(flow, "fixture")
            with self.assertRaises(RunnerError):
                flow.approve("fixture", "wrong-revision", "operator")
            state = flow.store.load("fixture")
            state["prechecked"] = ["HU-01"]
            flow.store.save(state)
            flow.revise("fixture", "HU-01", "Material definition correction")
            self.assertEqual(flow.store.load("fixture")["prechecked"], [])

    def test_complete_hu_flow_with_offline_doubles_and_signed_evidence(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            stories = root / "stories"
            stories.mkdir()
            (stories / "user-onboarding-mvp-completion.sp.md").write_text("HU-01 rules and CA1 to CA6")
            flow = WalletOrchestrationFlow.__new__(WalletOrchestrationFlow)
            flow.repository = root
            flow.store = ArtifactStore(root / "out", root / "control")
            flow.store.key(create=True)
            construction = {key: {"agent": "backend_engineer" if key == "implement_backend" else "other"} for key in AUTHORS}
            flow.registry = type("Registry", (), {"revision": "fixed", "material": {
                "AGENTS.md": "Constraints", "architecture/README.md": "Design",
                "docs/requirements/open-questions.md": "Questions",
            }, "tasks": {"construction": construction}})()

            class OfflineExecutor:
                def invoke(self, phase, task_key, context):
                    files = [{"path": path.replace("*", "wallet"), "content": "Draft artifact"}
                             for path in REQUIRED.get(task_key, [])]
                    tasks = []
                    if task_key == "plan_delivery":
                        files = [{"path": "tasks.md", "content": "- [ ] 1.1 Implement CA1 with scenario and check"}]
                        tasks = [{"task_id": "1.1", "owner": "backend_engineer", "criteria": [f"CA{number}" for number in range(1, 7)],
                                  "scenarios": ["S1"], "paths": ["backend/Wallet.java"], "checks": ["unit"]}]
                    if task_key == "implement_backend":
                        files = [{"path": "backend/Wallet.java", "content": "class Wallet {}"}]
                    if task_key in REVIEWERS:
                        files = [{"path": "reviews/" + task_key + ".md", "content": "Offline fixture review"}]
                    return StageOutput(summary="Offline test double, not real model evidence",
                        files=files, covered_criteria=[f"CA{number}" for number in range(1, 7)],
                        tasks=tasks, verdict="pass" if task_key in REVIEWERS or task_key in {
                            "review_security_design", "plan_implementation", "review_product_scope"} else "draft")

            flow.executor = OfflineExecutor()
            from wallet_agents.contracts import RuntimePolicy
            policy = RuntimePolicy(model="offline-fixture", max_calls=30, max_output_tokens=1000,
                max_context_bytes=100000, max_seconds=60, max_corrections=2,
                approved_profiles=sorted(PRINCIPAL_ROLES), checks={name: {
                    "image": "fixture@sha256:" + "a" * 64, "command": ["true"],
                    "target": "definition" if name == "openspec" else "product",
                } for name in ("unit", "openspec")})
            result = flow.start("end-to-end", stories, None, policy, ["HU-01"])
            for gate in ("G0", "G1-HU-01", "G2-HU-01"):
                self.assertEqual(result["gate"], gate)
                if gate.startswith("G2-"):
                    state = flow.store.load("end-to-end")
                    state["outputs"]["HU-01"]["review_product_scope"]["verdict"] = "changes_required"
                    flow.store.save(state)
                    with self.assertRaises(RunnerError):
                        flow.approve("end-to-end", result["revision"], "offline-operator")
                    state["outputs"]["HU-01"]["review_product_scope"]["verdict"] = "pass"
                    flow.store.save(state)
                flow.approve("end-to-end", result["revision"], "offline-operator")
                result = flow.resume("end-to-end")
            self.assertEqual(result["status"], "awaiting_checks")
            request_path = flow.store.run_root("end-to-end") / "check-request.json"
            state = flow.store.load("end-to-end")
            snapshot = flow.snapshot(state, "HU-01")
            request = json.loads(request_path.read_text())
            self.assertEqual(request["phase"], "definition")
            self.assertEqual(request["change_id"], "hu-01-onboarding")
            self.assertEqual(set(request["checks"]), {"openspec"})
            payload = {"run_id": "end-to-end", "story_id": "HU-01", "result": {
                "check_id": "openspec", "snapshot": snapshot, "exit_code": 0,
                "stdout_sha256": "offline-fixture", "executor": "external-container-controller"}}
            write_json(flow.store.control, "evidence/end-to-end/HU-01/openspec.json", flow.store.sign(payload))
            result = flow.resume("end-to-end")
            self.assertEqual(result["status"], "awaiting_checks")
            self.assertEqual(json.loads(request_path.read_text())["phase"], "construction")
            from wallet_agents.main import check_request
            self.assertEqual(set(check_request(flow, "end-to-end")["checks"]), {"unit", "openspec"})
            state = flow.store.load("end-to-end")
            snapshot = flow.snapshot(state, "HU-01")
            payload = {"run_id": "end-to-end", "story_id": "HU-01", "result": {
                "check_id": "unit", "snapshot": "stale", "exit_code": 0,
                "stdout_sha256": "offline-fixture", "executor": "external-container-controller"}}
            write_json(flow.store.control, "evidence/end-to-end/HU-01/unit.json", flow.store.sign(payload))
            self.assertEqual(flow.resume("end-to-end")["status"], "awaiting_checks")
            payload["result"].update(snapshot=snapshot, exit_code=1)
            write_json(flow.store.control, "evidence/end-to-end/HU-01/unit.json", flow.store.sign(payload))
            passed = {**payload, "result": {**payload["result"], "snapshot": snapshot, "check_id": "openspec", "exit_code": 0}}
            write_json(flow.store.control, "evidence/end-to-end/HU-01/openspec.json", flow.store.sign(passed))
            self.assertEqual(flow.resume("end-to-end")["status"], "awaiting_checks")
            self.assertEqual(flow.store.load("end-to-end")["corrections"], 1)
            flow.revise("end-to-end", "HU-01", "Repair the offline fixture", construction=True)
            self.assertEqual(flow.resume("end-to-end")["status"], "awaiting_checks")
            new_snapshot = flow.snapshot(flow.store.load("end-to-end"), "HU-01")
            self.assertNotEqual(new_snapshot, snapshot)
            snapshot = new_snapshot
            for check in ("unit", "openspec"):
                payload = {"run_id": "end-to-end", "story_id": "HU-01", "result": {
                    "check_id": check, "snapshot": snapshot, "exit_code": 0,
                    "stdout_sha256": "offline-fixture", "executor": "external-container-controller"}}
                write_json(flow.store.control, f"evidence/end-to-end/HU-01/{check}.json", flow.store.sign(payload))
            result = flow.resume("end-to-end")
            self.assertEqual(result["gate"], "G3-HU-01")
            flow.approve("end-to-end", result["revision"], "offline-operator")
            result = flow.resume("end-to-end")
            self.assertEqual(result["status"], "completed")
            self.assertEqual(result["accepted"], ["HU-01"])


@unittest.skipUnless(importlib.util.find_spec("crewai"), "Full runtime image required")
class NativeCrewAITests(unittest.TestCase):
    @unittest.skipUnless(importlib.util.find_spec("copilot"), "Copilot SDK required")
    def test_client_options_match_the_real_sdk_signature(self):
        import inspect
        from copilot import CopilotClient
        from wallet_agents.copilot_llm import client_options

        signature = inspect.signature(CopilotClient.__init__)
        for mode in ("true", "false"):
            with patch.dict(os.environ, {"COPILOT_USE_LOGGED_IN_USER": mode, "COPILOT_GITHUB_TOKEN": "t"}):
                signature.bind(None, **client_options())

    def test_copilot_adapter_is_a_native_crewai_llm(self):
        from crewai import BaseLLM

        llm = create_copilot_llm(model="gpt-test", timeout=30)
        self.assertIsInstance(llm, BaseLLM)
        self.assertFalse(llm.supports_function_calling())

    def test_native_agent_uses_architect_profile_with_local_llm(self):
        from crewai import BaseLLM
        from wallet_agents.contracts import RuntimePolicy
        calls = []
        response = StageOutput(summary="Native SDK offline double", covered_criteria=["CA1"])

        class LocalLLM(BaseLLM):
            def call(self, messages, **kwargs):
                calls.append(messages)
                return "Final Answer: " + response.model_dump_json()

            def supports_function_calling(self):
                return False

        with tempfile.TemporaryDirectory() as directory:
            registry = SpecialistRegistry(configured_fixture(directory))
            policy = RuntimePolicy(model="offline-fixture", max_calls=5, max_output_tokens=1000,
                max_context_bytes=500000, max_seconds=60, max_corrections=1,
                approved_profiles=sorted(PRINCIPAL_ROLES))
            with patch("crewai.LLM", return_value=LocalLLM(model="offline-fixture")):
                crew = DefinitionCrewFactory(registry, policy).build("design_architecture", {"change_id": "offline"})
                self.assertIn("# Arquitecto", crew.agents[0].backstory)
                self.assertIn("OpenAPI", crew.agents[0].backstory)
                result = crew.kickoff()
        self.assertEqual(StageOutput.model_validate_json(result.raw).summary, response.summary)
        self.assertTrue(calls)

    def test_native_flow_can_pause_without_models(self):
        from wallet_agents.flow import native_resume

        class PausedController:
            def resume(self, run_id):
                return {"run_id": run_id, "status": "awaiting_human"}

        self.assertEqual(native_resume(PausedController(), "offline")["status"], "awaiting_human")


if __name__ == "__main__":
    unittest.main()