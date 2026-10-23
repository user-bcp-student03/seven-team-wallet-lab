"""Confined storage and approvals issued by a separate trusted operator process."""

import hashlib
import json
import os
import re
import secrets
from contextlib import contextmanager

try:
    import fcntl
except ImportError:  # Windows host runner
    fcntl = None
    import msvcrt
from datetime import datetime, timedelta, timezone
from pathlib import Path
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey

from .contracts import safe_relative


class RunnerError(ValueError):
    pass


def digest(value: object) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=True).encode()).hexdigest()


def confined(root: Path, relative: str) -> Path:
    safe_relative(relative)
    root = root.resolve()
    candidate = root
    for part in relative.split("/"):
        candidate = candidate / part
        if candidate.is_symlink() or (
            candidate.exists() and getattr(candidate.lstat(), "st_file_attributes", 0) & 0x400
        ):
            raise RunnerError("Linked paths are not permitted")
    if not candidate.resolve().is_relative_to(root):
        raise RunnerError("Path escapes its root")
    return candidate


def write_json(root: Path, relative: str, value: object) -> None:
    target = confined(root, relative)
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_name(target.name + ".tmp-" + secrets.token_hex(8))
    try:
        with temporary.open("x", encoding="utf-8") as stream:
            json.dump(value, stream, ensure_ascii=True, sort_keys=True, indent=2)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, target)
    finally:
        temporary.unlink(missing_ok=True)


def tree_digest(root: Path) -> str:
    records = {}
    if root.exists():
        for path in sorted(root.rglob("*")):
            relative = path.relative_to(root).as_posix()
            checked = confined(root, relative)
            if checked.is_file():
                records[relative] = hashlib.sha256(checked.read_bytes()).hexdigest()
    return digest(records)


class ArtifactStore:
    def __init__(self, output: Path, control: Path, signing_key: Path | None = None):
        self.output = output.resolve()
        self.control = control.resolve()
        self.signing_key = (signing_key or self.control / "operator.key").resolve()
        self.output.mkdir(parents=True, exist_ok=True)
        if self.control.is_relative_to(self.output) or self.output.is_relative_to(self.control):
            raise RunnerError("Control and agent output volumes must be separate")

    def run_root(self, run_id: str) -> Path:
        if not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9-]{0,63}", run_id):
            raise RunnerError("Invalid run ID")
        return confined(self.output, run_id)

    @contextmanager
    def lock(self, run_id: str):
        root = self.run_root(run_id)
        root.mkdir(parents=True, exist_ok=True)
        with confined(root, "run.lock").open("a") as stream:
            try:
                if fcntl:
                    fcntl.flock(stream, fcntl.LOCK_EX | fcntl.LOCK_NB)
                else:
                    stream.seek(0)
                    msvcrt.locking(stream.fileno(), msvcrt.LK_NBLCK, 1)
            except (BlockingIOError, OSError) as error:
                raise RunnerError("Run already has an active operator") from error
            try:
                yield root
            finally:
                if fcntl:
                    fcntl.flock(stream, fcntl.LOCK_UN)
                else:
                    stream.seek(0)
                    msvcrt.locking(stream.fileno(), msvcrt.LK_UNLCK, 1)

    def load(self, run_id: str) -> dict:
        return json.loads(confined(self.run_root(run_id), "run.json").read_text())

    def save(self, state: dict) -> None:
        write_json(self.run_root(state["run_id"]), "run.json", state)

    def key(self, create: bool = False) -> bytes:
        self.control.mkdir(parents=True, exist_ok=True)
        if create and not self.signing_key.exists():
            self.signing_key.parent.mkdir(parents=True, exist_ok=True)
            key = Ed25519PrivateKey.generate()
            private_bytes = key.private_bytes(serialization.Encoding.Raw, serialization.PrivateFormat.Raw, serialization.NoEncryption())
            descriptor = os.open(self.signing_key, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(descriptor, "wb") as stream:
                stream.write(private_bytes)
            public_bytes = key.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
            public_path = confined(self.control, "operator.pub")
            if not public_path.exists():
                with public_path.open("xb") as stream:
                    stream.write(public_bytes)
        if not self.signing_key.exists():
            raise RunnerError("Initialize control with the trusted operator service")
        private_bytes = self.signing_key.read_bytes()
        if create:
            public_path = confined(self.control, "operator.pub")
            key = Ed25519PrivateKey.from_private_bytes(private_bytes)
            derived_public = key.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
            if public_path.exists() and public_path.read_bytes() != derived_public:
                raise RunnerError("Operator signing key does not match the trusted public key")
            if not public_path.exists():
                with public_path.open("xb") as stream:
                    stream.write(derived_public)
        return private_bytes

    def sign(self, payload: dict) -> dict:
        signature = Ed25519PrivateKey.from_private_bytes(self.key()).sign(digest(payload).encode())
        return {"payload": payload, "signature": signature.hex()}

    def verified(self, record: dict) -> dict:
        public_path = confined(self.control, "operator.pub")
        if not public_path.exists():
            raise RunnerError("Trusted operator public key is unavailable")
        try:
            public_key = Ed25519PublicKey.from_public_bytes(public_path.read_bytes())
            public_key.verify(bytes.fromhex(record.get("signature", "")), digest(record["payload"]).encode())
        except (InvalidSignature, ValueError, KeyError) as error:
            raise RunnerError("Invalid control-plane signature") from error
        return record["payload"]

    def approve(self, state: dict, revision: str, reviewer: str, hours: int = 24) -> None:
        if not reviewer.strip() or not 1 <= hours <= 168:
            raise RunnerError("Reviewer and bounded validity are required")
        payload = {
            "run_id": state["run_id"], "gate": state["gate"], "revision": revision,
            "reviewer": reviewer, "expires": (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat(),
        }
        write_json(self.control, f"approvals/{state['run_id']}/{state['gate']}.json", self.sign(payload))

    def require_approval(self, run_id: str, gate: str, revision: str) -> dict:
        path = confined(self.control, f"approvals/{run_id}/{gate}.json")
        if not path.exists():
            raise RunnerError(f"Waiting for human gate {gate}")
        payload = self.verified(json.loads(path.read_text()))
        if payload["run_id"] != run_id or payload["gate"] != gate or payload["revision"] != revision:
            raise RunnerError("Approval does not match the current revision")
        if datetime.fromisoformat(payload["expires"]) <= datetime.now(timezone.utc):
            raise RunnerError("Approval expired")
        return payload

    def revoke(self, run_id: str, gate: str) -> None:
        confined(self.control, f"approvals/{run_id}/{gate}.json").unlink(missing_ok=True)