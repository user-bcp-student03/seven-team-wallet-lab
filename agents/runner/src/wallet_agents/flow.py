"""Persistent G0-G3 controller; agents never issue approvals or execute commands."""

import hashlib
import json
import re
import shutil
import time
from pathlib import Path

from .artifacts import ArtifactStore, RunnerError, confined, digest, tree_digest, write_json
from .contracts import CheckResult, RuntimePolicy, StageOutput
from .crew import PRINCIPAL_ROLES, CrewAIExecutor, SpecialistRegistry


STORIES = {
    "HU-01": ("user-onboarding-mvp-completion.sp.md", "hu-01-onboarding", 6),
    "HU-02": ("payer-low-value-payment-confirmation.sp.md", "hu-02-payment-confirmation", 6),
    "HU-04": ("payment-idempotency-protection.sp.md", "hu-04-idempotency", 4),
}
DEFERRED = {
    "HU-03": "merchant-qr-payment-status-visibility.sp.md",
    "HU-05": "payment-failure-reversal-handling.sp.md",
    "HU-06": "operations-transaction-reconciliation.sp.md",
}
DEFINITION = [
    "refine_requirements", "design_architecture", "design_financial_integrity",
    "review_security_design", "define_test_strategy", "plan_delivery",
    "plan_implementation", "review_product_scope",
]
AUTHORS = ["implement_backend", "implement_frontend", "implement_platform", "integrate_initiative"]
REVIEWERS = ["review_architecture_implementation", "review_security_implementation", "verify_change", "recommend_product_acceptance"]
REQUIRED = {
    "refine_requirements": ["proposal.md", "specs/*/spec.md"],
    "design_architecture": ["design.md", "architecture/c4.md", "api/openapi.yaml"],
    "design_financial_integrity": ["architecture/ledger.md"],
    "review_security_design": ["security/threat-model.md"],
    "define_test_strategy": ["testing/test-plan.md"],
    "plan_delivery": ["tasks.md"],
    "plan_implementation": ["testing/plan-review.md"],
    "review_product_scope": ["product/scope-review.md"],
}
DOC_ROOTS = {"proposal.md", "design.md", "tasks.md", "specs", "architecture", "api", "security", "testing", "product", "reviews"}
PRODUCT_ROOTS = {"backend", "frontend", "orchestration"}
DESTINATIONS = {
    "refine_requirements": ["proposal.md", "specs/*/spec.md", "product/traceability.md"],
    "design_architecture": ["design.md", "architecture/c4.md", "architecture/adr/*.md", "api/openapi.yaml"],
    "design_financial_integrity": ["architecture/ledger.md"],
    "review_security_design": ["security/*.md"],
    "define_test_strategy": ["testing/test-plan.md", "testing/coverage.md"],
    "plan_delivery": ["tasks.md", "product/delivery-plan.md"],
    "plan_implementation": ["testing/plan-review.md"],
    "review_product_scope": ["product/scope-review.md"],
}


def discover_stories(folder: Path) -> list[dict]:
    """Lists the HU files found in the input folder and whether each can be selected."""
    if not folder.is_dir():
        raise RunnerError("Story input folder not found")
    known = {name: (story_id, True) for story_id, (name, _, _) in STORIES.items()}
    known.update({name: (story_id, False) for story_id, name in DEFERRED.items()})
    found = []
    for path in sorted(folder.glob("*.sp.md")):
        checked = confined(folder, path.name)
        if checked.stat().st_size > 500_000:
            raise RunnerError("Story exceeds size limit")
        text = checked.read_text(encoding="utf-8")
        title = next((line[2:].strip() for line in text.splitlines() if line.startswith("# ")), path.name)
        section = text.split("## Criterios de aceptación", 1)
        criteria = len(re.findall(r"^\d+\.", section[1].split("\n## ")[0], re.M)) if len(section) == 2 else 0
        story_id, active = known.get(path.name, (None, False))
        note = ""
        if story_id is None:
            note = "no tiene un ID HU conocido"
        elif not active:
            note = "diferida fuera del alcance activo"
        elif criteria and criteria != STORIES[story_id][2]:
            note = f"{criteria} criterios; el catalogo espera {STORIES[story_id][2]}"
        found.append({"story_id": story_id, "file": path.name, "title": title, "criteria": criteria,
                      "selectable": active and not note, "note": note})
    return sorted(found, key=lambda item: (item["story_id"] is None, item["story_id"] or item["file"]))


class WalletOrchestrationFlow:
    def __init__(self, repository: Path, store: ArtifactStore, executor=None):
        self.repository = repository.resolve()
        self.store = store
        self.registry = SpecialistRegistry(repository)
        self.executor = executor

    def start(self, run_id: str, stories: Path, rules: Path | None, policy: RuntimePolicy, selected: list[str]) -> dict:
        if not policy.model.strip() or "REPLACE_WITH_" in policy.model:
            raise RunnerError("Select an explicit approved provider model before G0")
        if set(policy.approved_profiles) != PRINCIPAL_ROLES:
            raise RunnerError("Policy must explicitly include all five specialist profiles")
        with self.store.lock(run_id) as root:
            if confined(root, "run.json").exists():
                raise RunnerError("Run already exists; use resume")
            available = {item["story_id"]: item for item in discover_stories(stories) if item["selectable"]}
            if not selected or len(set(selected)) != len(selected):
                raise RunnerError(f"Select one or more stories to work on; available: {sorted(available)}")
            unavailable = [story_id for story_id in selected if story_id not in available]
            if unavailable:
                raise RunnerError(f"Stories not selectable from the input folder: {unavailable}")
            if "HU-02" in selected and not {"HU-01", "HU-04"}.issubset(selected):
                raise RunnerError("HU-02 payments require HU-01 and HU-04 in the same selection")
            sources = {}
            for story_id in STORIES:
                if story_id in selected:
                    sources[story_id] = confined(stories, available[story_id]["file"]).read_text(encoding="utf-8")
            rules_text = ""
            if rules:
                path = confined(rules.parent, rules.name)
                if path.stat().st_size > 500_000:
                    raise RunnerError("Rules exceed size limit")
                rules_text = path.read_text(encoding="utf-8")
            state = {
                "run_id": run_id, "policy": policy.model_dump(mode="json"), "sources": sources,
                "rules": rules_text, "registry_revision": self.registry.revision,
                "created": time.time(), "calls": 0, "corrections": 0, "inflight": None,
                "outputs": {}, "feedback": {}, "history": [], "accepted": [],
                "gate": "G0", "status": "awaiting_human", "construction_story": None,
            }
            for area in PRODUCT_ROOTS:
                source = self.repository / area
                if source.exists():
                    for path in source.rglob("*"):
                        if path.is_file():
                            relative = path.relative_to(self.repository).as_posix()
                            checked = confined(self.repository, relative)
                            if any(part.startswith(".") for part in path.relative_to(source).parts):
                                continue
                            if checked.stat().st_size > 500_000:
                                raise RunnerError("Baseline contains an oversized file")
                            destination = confined(root, "workspace/" + relative)
                            destination.parent.mkdir(parents=True, exist_ok=True)
                            destination.write_bytes(checked.read_bytes())
            state["baseline"] = tree_digest(root / "workspace")
            state["base"] = digest({key: state[key] for key in ("policy", "sources", "rules", "registry_revision", "baseline")})
            self.store.save(state)
            return self.status(run_id)

    def revision(self, state: dict, gate: str | None = None) -> str:
        gate = gate or state["gate"]
        if gate == "G0":
            return state["base"]
        story_id = gate.split("-", 1)[1]
        outputs = state["outputs"].get(story_id, {})
        keys = ["refine_requirements"] if gate.startswith("G1-") else DEFINITION
        payload = {"base": state["base"], "outputs": {key: outputs.get(key) for key in keys}, "feedback": state["feedback"].get(story_id, [])}
        if gate.startswith("G3-"):
            payload["implementation"] = outputs
            payload["workspace"] = tree_digest(self.store.run_root(state["run_id"]) / "workspace")
            payload["evidence"] = self.evidence(state, story_id)
        return digest(payload)

    def status(self, run_id: str) -> dict:
        state = self.store.load(run_id)
        return {
            "run_id": run_id, "status": state["status"], "gate": state["gate"],
            "revision": self.revision(state) if state["status"] == "awaiting_human" else None,
            "calls": state["calls"], "corrections": state["corrections"],
            "accepted": state["accepted"], "inflight": state["inflight"],
            "blockers": self.blockers(state), "authorizations": state["history"],
        }

    def blockers(self, state: dict) -> list[str]:
        if state["gate"] in {"G0", "DONE"}:
            return []
        story_id = state["gate"].split("-", 1)[1]
        return [text for output in state["outputs"].get(story_id, {}).values() for text in output["blockers"]]

    def approve(self, run_id: str, revision: str, reviewer: str, gate: str | None = None):
        with self.store.lock(run_id):
            state = self.store.load(run_id)
            if gate and gate != state["gate"]:
                history = next((record for record in state["history"] if record["gate"] == gate), None)
                if not history or history["revision"] != revision:
                    raise RunnerError("Unknown historical authorization revision")
                self.store.approve({**state, "gate": gate}, revision, reviewer)
                return
            if state["status"] != "awaiting_human" or revision != self.revision(state):
                raise RunnerError("Review the exact current gate revision before approval")
            if self.blockers(state):
                raise RunnerError("Resolve blockers through revise before approving")
            if state["gate"].startswith("G2-"):
                outputs = state["outputs"][state["gate"].split("-", 1)[1]]
                reviewers = ("review_security_design", "plan_implementation", "review_product_scope")
                if any(outputs[key]["verdict"] != "pass" for key in reviewers):
                    raise RunnerError("Security, task and product-scope reviews must pass before G2")
            if state["gate"].startswith("G3-"):
                outputs = state["outputs"][state["gate"].split("-", 1)[1]]
                if any(outputs[key]["verdict"] != "pass" for key in REVIEWERS):
                    raise RunnerError("All independent reviews must pass")
            self.store.approve(state, revision, reviewer)

    def resume(self, run_id: str) -> dict:
        with self.store.lock(run_id) as root:
            state = self.store.load(run_id)
            policy = RuntimePolicy.model_validate(state["policy"])
            if state["registry_revision"] != self.registry.revision:
                raise RunnerError("Specialist/configuration revision changed; start a new reviewed run")
            if state["inflight"]:
                raise RunnerError("Interrupted model call; explicit recover is required before retry")
            executor = self.executor or CrewAIExecutor(self.registry, policy)
            while state["status"] != "completed":
                for record in state["history"]:
                    self.store.require_approval(run_id, record["gate"], record["revision"])
                if time.time() - state["created"] > policy.max_seconds:
                    raise RunnerError("Run time budget exhausted")
                if state["status"] == "awaiting_human":
                    revision = self.revision(state)
                    try:
                        self.store.require_approval(run_id, state["gate"], revision)
                    except RunnerError as error:
                        if str(error).startswith("Waiting for human gate"):
                            break
                        raise
                    if self.blockers(state):
                        raise RunnerError("Blockers invalidate approval")
                    state["history"].append({"gate": state["gate"], "revision": revision})
                    if state["gate"].startswith("G3-"):
                        state["accepted"].append(state["gate"].split("-", 1)[1])
                        state["construction_story"] = None
                    state["status"] = "running"
                    self.store.save(state)
                job = self.next_job(state)
                if job is None:
                    self.store.save(state)
                    if state["status"] in {"awaiting_human", "awaiting_checks", "completed"}:
                        break
                    continue
                story_id, phase, task_key = job
                if state["calls"] >= policy.max_calls:
                    raise RunnerError("Model call budget exhausted")
                context = self.context(state, story_id, phase, task_key)
                state["calls"] += 1
                state["inflight"] = list(job)
                self.store.save(state)
                output = executor.invoke(phase, task_key, context)
                if not isinstance(output, StageOutput):
                    output = StageOutput.model_validate(output)
                self.validate_output(state, story_id, phase, task_key, output)
                for entry in output.files:
                    prefix = "workspace/" if task_key in AUTHORS else f"definition/openspec/changes/{STORIES[story_id][1]}/"
                    target = confined(root, prefix + entry.path)
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_text(entry.content, encoding="utf-8")
                state["outputs"].setdefault(story_id, {})[task_key] = output.model_dump(mode="json")
                state["inflight"] = None
                self.store.save(state)
            return self.status(run_id)

    def next_job(self, state: dict):
        for story_id in state["sources"]:
            outputs = state["outputs"].get(story_id, {})
            if "refine_requirements" not in outputs:
                return story_id, "definition", "refine_requirements"
            if not any(record["gate"] == f"G1-{story_id}" for record in state["history"]):
                state.update(gate=f"G1-{story_id}", status="awaiting_human")
                return None
            for task_key in DEFINITION[1:]:
                if task_key not in outputs:
                    return story_id, "definition", task_key
            if not any(record["gate"] == f"G2-{story_id}" for record in state["history"]):
                state.update(gate=f"G2-{story_id}", status="awaiting_human")
                return None
            if story_id not in state.get("prechecked", []):
                evidence = self.evidence(state, story_id)
                if "openspec" not in evidence:
                    state["check_phase"] = "definition"
                    self.prepare_checks(state, story_id, definition_only=True)
                    state["status"] = "awaiting_checks"
                    return None
                if evidence["openspec"]["exit_code"] != 0:
                    raise RunnerError("OpenSpec definition check failed; revise and reapprove G1/G2")
                state.setdefault("prechecked", []).append(story_id)
        for story_id in ("HU-01", "HU-04", "HU-02"):
            if story_id not in state["sources"] or story_id in state["accepted"]:
                continue
            state["construction_story"] = story_id
            outputs = state["outputs"][story_id]
            owners = {task["owner"] for task in outputs["plan_delivery"]["tasks"]}
            for task_key in AUTHORS:
                owner = self.registry.tasks["construction"][task_key]["agent"]
                if task_key != "integrate_initiative" and owner not in owners:
                    continue
                if task_key not in outputs:
                    return story_id, "construction", task_key
            evidence = self.evidence(state, story_id)
            expected = self.check_ids(state, story_id)
            if set(evidence) != expected:
                state["check_phase"] = "construction"
                self.prepare_checks(state, story_id)
                state["status"] = "awaiting_checks"
                return None
            if any(record["exit_code"] != 0 for record in evidence.values()):
                self.correct_construction(state, story_id, {"failed_checks": evidence})
                return self.next_job(state)
            state["status"] = "running"
            for task_key in REVIEWERS:
                if task_key not in outputs:
                    return story_id, "construction", task_key
                if outputs[task_key]["verdict"] != "pass" or outputs[task_key]["blockers"]:
                    self.correct_construction(state, story_id, {"reviewer": task_key, "findings": outputs[task_key]})
                    return self.next_job(state)
            state.update(gate=f"G3-{story_id}", status="awaiting_human")
            return None
        state.update(status="completed", gate="DONE")
        return None

    def context(self, state: dict, story_id: str, phase: str, task_key: str) -> dict:
        root = self.store.run_root(state["run_id"])
        outputs = state["outputs"].get(story_id, {})
        paths = self.allowed_paths(state, story_id, task_key) if task_key in AUTHORS else []
        workspace = {}
        if phase == "construction":
            for path in (root / "workspace").rglob("*"):
                if path.is_file():
                    relative = path.relative_to(root / "workspace").as_posix()
                    workspace[relative] = confined(root / "workspace", relative).read_text(encoding="utf-8")
        return {
            "change_id": STORIES[story_id][1], "current_story_only": story_id,
            "source": state["sources"][story_id], "business_rules": state["rules"],
            "criteria": [f"CA{number}" for number in range(1, STORIES[story_id][2] + 1)],
            "constraints": self.registry.material["AGENTS.md"],
            "architecture": self.registry.material["architecture/README.md"],
            "open_questions": self.registry.material["docs/requirements/open-questions.md"],
            "prior_outputs": outputs, "feedback": state["feedback"].get(story_id, []),
            "construction_feedback": state.get("construction_feedback", ""),
            "required_output_paths": REQUIRED.get(task_key, []),
            "allowed_artifact_patterns": DESTINATIONS.get(task_key, ["reviews/*.md"]),
            "allowed_product_paths": paths, "allowed_checks": list(state["policy"]["checks"]),
            "workspace": workspace, "executed_evidence": self.evidence(state, story_id),
            "remaining_seconds": max(1, int(state["policy"]["max_seconds"] - (time.time() - state["created"]))),
            "instruction": "Work only on current_story_only. Return full file content, not shell commands. Reviewers must output pass or changes_required and never change product files.",
        }

    def allowed_paths(self, state: dict, story_id: str, task_key: str) -> list[str]:
        tasks = state["outputs"][story_id]["plan_delivery"]["tasks"]
        owner = self.registry.tasks["construction"][task_key]["agent"]
        return [path for task in tasks if task_key == "integrate_initiative" or task["owner"] == owner for path in task["paths"]]

    def validate_output(self, state: dict, story_id: str, phase: str, task_key: str, output: StageOutput):
        criteria = {f"CA{number}" for number in range(1, STORIES[story_id][2] + 1)}
        if not set(output.covered_criteria).issubset(criteria):
            raise RunnerError("Output cites unknown acceptance criteria")
        if task_key == "refine_requirements" and set(output.covered_criteria) != criteria:
            raise RunnerError("PO must preserve every original criterion")
        paths = {entry.path for entry in output.files}
        for pattern in REQUIRED.get(task_key, []):
            if not any(Path(path).match(pattern) for path in paths):
                raise RunnerError(f"Required artifact missing: {pattern}")
        for entry in output.files:
            if task_key in AUTHORS:
                if entry.path not in self.allowed_paths(state, story_id, task_key):
                    raise RunnerError("Construction output is outside approved task paths")
            elif not any(Path(entry.path).match(pattern) for pattern in DESTINATIONS.get(task_key, ["reviews/*.md"])):
                raise RunnerError("Artifact outside the permitted change destinations")
            if entry.path == "tasks.md" and re.search(r"\[[xX]\]", entry.content):
                raise RunnerError("Agents cannot mark OpenSpec tasks completed")
        if task_key == "plan_delivery":
            if not output.tasks or len({task.task_id for task in output.tasks}) != len(output.tasks):
                raise RunnerError("Unique structured OpenSpec tasks are required")
            if {criterion for task in output.tasks for criterion in task.criteria} != criteria:
                raise RunnerError("Implementation tasks must cover every original criterion")
            tasks_text = next(entry.content for entry in output.files if entry.path == "tasks.md")
            for task in output.tasks:
                if not set(task.criteria).issubset(criteria) or not set(task.checks).issubset(state["policy"]["checks"]):
                    raise RunnerError("Task references unknown criteria or checks")
                if not re.search(r"- \[ \] " + re.escape(task.task_id) + r"\s", tasks_text):
                    raise RunnerError("Structured task has no corresponding OpenSpec checkbox")
                if any(path.split("/")[0] not in PRODUCT_ROOTS for path in task.paths):
                    raise RunnerError("Product path outside backend/frontend/orchestration")

    def check_ids(self, state: dict, story_id: str) -> set[str]:
        selected = set(state["accepted"]) | {story_id}
        return {"openspec"} | {check for story in selected for task in state["outputs"][story]["plan_delivery"]["tasks"] for check in task["checks"]}

    def snapshot(self, state: dict, story_id: str) -> str:
        return digest({"workspace": tree_digest(self.store.run_root(state["run_id"]) / "workspace"),
                       "definition": self.revision(state, f"G2-{story_id}"), "correction": state["corrections"]})

    def prepare_checks(self, state: dict, story_id: str, definition_only: bool = False):
        root = self.store.run_root(state["run_id"])
        snapshot = self.snapshot(state, story_id)
        if "openspec" not in state["policy"]["checks"]:
            raise RunnerError("An external OpenSpec validation check is required")
        selected = {"openspec"} if definition_only else self.check_ids(state, story_id)
        checks = {key: state["policy"]["checks"][key] for key in selected}
        for spec in checks.values():
            if spec.get("target", "product") not in {"product", "definition"}:
                raise RunnerError("Check target must be product or definition")
            if not re.fullmatch(r"[^\s]+@sha256:[0-9a-f]{64}", spec.get("image", "")):
                raise RunnerError("Check images must be approved immutable digest references")
            if not isinstance(spec.get("command"), list) or not spec["command"] or not all(isinstance(part, str) for part in spec["command"]):
                raise RunnerError("Check commands must be explicit approved argument arrays")
        write_json(root, "check-request.json", {"run_id": state["run_id"], "story_id": story_id,
            "change_id": STORIES[story_id][1],
            "snapshot": snapshot, "phase": "definition" if definition_only else "construction", "checks": checks})

    def evidence(self, state: dict, story_id: str) -> dict:
        directory = self.store.control / "evidence" / state["run_id"] / story_id
        records = {}
        snapshot = self.snapshot(state, story_id)
        if directory.exists():
            for path in directory.glob("*.json"):
                payload = self.store.verified(json.loads(confined(directory, path.name).read_text()))
                result = CheckResult.model_validate(payload["result"])
                if payload["run_id"] == state["run_id"] and payload["story_id"] == story_id and result.snapshot == snapshot:
                    records[result.check_id] = result.model_dump()
        return records

    def correct_construction(self, state: dict, story_id: str, findings: dict) -> None:
        if state["corrections"] >= state["policy"]["max_corrections"]:
            raise RunnerError("Correction budget exhausted; human escalation required")
        if story_id in state["accepted"]:
            raise RunnerError("Accepted construction requires a new reviewed run")
        state["corrections"] += 1
        state["outputs"][story_id] = {key: value for key, value in state["outputs"][story_id].items() if key in DEFINITION}
        state["construction_feedback"] = findings
        state.update(status="running", gate=f"CONSTRUCTION-{story_id}", inflight=None)
        self.store.save(state)

    def revise(self, run_id: str, story_id: str, feedback: str, construction: bool = False):
        with self.store.lock(run_id):
            state = self.store.load(run_id)
            if story_id not in state["sources"] or not feedback.strip() or state["inflight"]:
                raise RunnerError("Valid story, feedback and a settled call are required")
            if state["corrections"] >= state["policy"]["max_corrections"]:
                raise RunnerError("Correction budget exhausted")
            if construction and state["construction_story"] != story_id:
                raise RunnerError("Only the current construction story can be corrected")
            if construction:
                self.correct_construction(state, story_id, {"human_feedback": feedback})
            else:
                if state["accepted"] or state["construction_story"]:
                    raise RunnerError("Material change after construction requires a new reviewed run")
                state["corrections"] += 1
                state["feedback"].setdefault(story_id, []).append(feedback)
                state["outputs"] = {}
                state["history"] = [record for record in state["history"] if record["gate"] == "G0"]
                state["prechecked"] = []
                definition = confined(self.store.run_root(run_id), "definition")
                if definition.exists():
                    shutil.rmtree(definition)
                state["status"] = "running"
            self.store.save(state)


def native_resume(controller: WalletOrchestrationFlow, run_id: str) -> dict:
    from crewai.flow.flow import Flow, start

    class HumanGatedWalletFlow(Flow):
        @start()
        def advance(self):
            return controller.resume(run_id)

    return HumanGatedWalletFlow().kickoff()