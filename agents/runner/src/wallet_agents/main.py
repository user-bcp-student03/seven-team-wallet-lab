"""Operator CLI. No model invocation occurs on import, start, status or approval."""

import argparse
import hashlib
import json
import sys
import time
from pathlib import Path

from .artifacts import ArtifactStore, RunnerError, confined, write_json
from .contracts import CheckResult, RuntimePolicy
from .flow import STORIES, WalletOrchestrationFlow, discover_stories, native_resume


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description="Human-gated wallet CrewAI runner")
    result.add_argument("--repository", type=Path, default=Path("/workspace"))
    result.add_argument("--output", type=Path, default=Path("/runs"))
    result.add_argument("--control", type=Path, default=Path("/control"))
    result.add_argument("--signing-key", type=Path, default=Path("/operator-secret/operator.key"))
    commands = result.add_subparsers(dest="command", required=True)
    commands.add_parser("init-control")
    listing = commands.add_parser("list-stories")
    listing.add_argument("--stories", type=Path, default=Path("/workspace/docs/requirements/user-stories"))
    for name in ("start", "status", "resume", "approve", "revoke", "revise", "recover", "check-request", "record-check", "export"):
        command = commands.add_parser(name)
        command.add_argument("--run-id", required=True)
        if name == "start":
            command.add_argument("--stories", type=Path, default=Path("/workspace/docs/requirements/user-stories"))
            command.add_argument("--select", required=True, help="Comma-separated HU IDs chosen from list-stories")
            command.add_argument("--rules", type=Path)
            command.add_argument("--policy", type=Path, default=Path("/control/policy.json"))
        if name in {"approve", "revoke"}:
            command.add_argument("--gate")
        if name == "approve":
            command.add_argument("--revision", required=True)
            command.add_argument("--reviewer", required=True)
        if name == "revise":
            command.add_argument("--story", required=True, choices=list(STORIES))
            command.add_argument("--feedback-file", required=True, type=Path)
            command.add_argument("--construction", action="store_true")
        if name == "recover":
            command.add_argument("--ack-uncertain-call", required=True, action="store_true")
        if name == "record-check":
            command.add_argument("--check-id", required=True)
            command.add_argument("--snapshot", required=True)
            command.add_argument("--exit-code", required=True, type=int)
            command.add_argument("--log-file", required=True, type=Path)
    return result


def authorize_effects(flow: WalletOrchestrationFlow, state: dict):
    if state["registry_revision"] != flow.registry.revision:
        raise RunnerError("Specialist revision changed")
    if time.time() - state["created"] > state["policy"]["max_seconds"]:
        raise RunnerError("Run time budget exhausted")
    for record in state["history"]:
        flow.store.require_approval(state["run_id"], record["gate"], record["revision"])


def check_request(flow: WalletOrchestrationFlow, run_id: str) -> dict:
    state = flow.store.load(run_id)
    authorize_effects(flow, state)
    if state["status"] != "awaiting_checks":
        raise RunnerError("No external checks are currently authorized")
    flow.prepare_checks(state, state["construction_story"], definition_only=state.get("check_phase") == "definition")
    return json.loads(confined(flow.store.run_root(run_id), "check-request.json").read_text())


def export_delivery(flow: WalletOrchestrationFlow, run_id: str) -> dict:
    with flow.store.lock(run_id) as root:
        state = flow.store.load(run_id)
        authorize_effects(flow, state)
        if state["status"] != "completed":
            raise RunnerError("Every story must have a valid G3 acceptance before export")
        destination = root / "delivery"
        if destination.exists():
            raise RunnerError("Delivery already exists; do not silently overwrite reviewed output")
        for product in (root / "workspace").rglob("*"):
            if product.is_file():
                relative = product.relative_to(root / "workspace").as_posix()
                target = confined(destination, relative)
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(confined(root / "workspace", relative).read_bytes())
        for story_id in state["accepted"]:
            for output in state["outputs"][story_id].values():
                for entry in output["files"]:
                    if entry["path"].split("/")[0] in {"backend", "frontend", "orchestration"}:
                        continue
                    relative = f"openspec/changes/{STORIES[story_id][1]}/{entry['path']}"
                    target = confined(destination, relative)
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_text(entry["content"], encoding="utf-8")
        write_json(root, "delivery-manifest.json", {"run_id": run_id, "accepted": state["accepted"],
                   "authorizations": state["history"], "note": "No files applied to the repository; tasks require evidence review before marking complete."})
        return {"delivery": str(destination), "repository_modified": False}


def main() -> None:
    arguments = parser().parse_args()
    try:
        if arguments.command == "list-stories":
            print(json.dumps({"stories": discover_stories(arguments.stories)}, ensure_ascii=True, indent=2))
            return
        store = ArtifactStore(arguments.output, arguments.control, arguments.signing_key)
        if arguments.command == "init-control":
            store.key(create=True)
            print(json.dumps({"control_initialized": True}))
            return
        flow = WalletOrchestrationFlow(arguments.repository, store)
        command = arguments.command
        if command == "start":
            policy = RuntimePolicy.model_validate_json(arguments.policy.read_text())
            selected = [item.strip() for item in arguments.select.split(",") if item.strip()]
            result = flow.start(arguments.run_id, arguments.stories, arguments.rules, policy, selected)
        elif command == "resume":
            result = native_resume(flow, arguments.run_id)
        elif command == "status":
            result = flow.status(arguments.run_id)
        elif command == "approve":
            flow.approve(arguments.run_id, arguments.revision, arguments.reviewer, arguments.gate)
            result = flow.status(arguments.run_id)
        elif command == "revoke":
            state = store.load(arguments.run_id)
            store.revoke(arguments.run_id, arguments.gate or state["gate"])
            result = {"revoked": arguments.gate or state["gate"]}
        elif command == "revise":
            flow.revise(arguments.run_id, arguments.story, arguments.feedback_file.read_text(), arguments.construction)
            result = flow.status(arguments.run_id)
        elif command == "recover":
            with store.lock(arguments.run_id):
                state = store.load(arguments.run_id)
                previous = state["inflight"]
                state["inflight"] = None
                store.save(state)
                result = {"acknowledged_uncertain_call": previous, "calls_not_refunded": state["calls"]}
        elif command == "check-request":
            with store.lock(arguments.run_id):
                result = check_request(flow, arguments.run_id)
        elif command == "record-check":
            with store.lock(arguments.run_id):
                request = check_request(flow, arguments.run_id)
                if arguments.check_id not in request["checks"] or arguments.snapshot != request["snapshot"]:
                    raise RunnerError("Check evidence does not match its authorized request")
                log_path = confined(store.control, arguments.log_file.relative_to(store.control).as_posix())
                log_bytes = log_path.read_bytes()
                record = CheckResult(check_id=arguments.check_id, snapshot=arguments.snapshot,
                    exit_code=arguments.exit_code, stdout_sha256=hashlib.sha256(log_bytes).hexdigest(),
                    log_excerpt=log_bytes.decode("utf-8", errors="replace")[-16000:],
                    executor="external-container-controller")
                payload = {"run_id": arguments.run_id, "story_id": request["story_id"], "result": record.model_dump()}
                write_json(store.control, f"evidence/{arguments.run_id}/{request['story_id']}/{arguments.check_id}.json", store.sign(payload))
                result = record.model_dump()
        else:
            result = export_delivery(flow, arguments.run_id)
        print(json.dumps(result, ensure_ascii=True, indent=2))
    except (ValueError, OSError, KeyError) as error:
        print(json.dumps({"error": str(error)}), file=sys.stderr)
        raise SystemExit(2) from error


if __name__ == "__main__":
    main()