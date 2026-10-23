"""Traceability contracts and validated runtime outputs."""

from dataclasses import dataclass
from decimal import Decimal
from typing import Literal

from pathlib import PurePosixPath
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


Phase = Literal["definition", "construction"]
EvidenceStatus = Literal["planned", "executed", "failed", "not_executed"]


@dataclass(frozen=True)
class SourceReference:
    relative_path: str
    sha256: str
    story_id: str | None
    criterion_ids: tuple[str, ...]


@dataclass(frozen=True)
class ExecutionBudget:
    model_id: str
    endpoint_id: str
    max_tokens: int
    max_cost: Decimal
    cost_currency: str
    max_seconds: int
    max_corrections: int


@dataclass(frozen=True)
class TaskScope:
    openspec_task_id: str
    story_ids: tuple[str, ...]
    criterion_ids: tuple[str, ...]
    scenario_ids: tuple[str, ...]
    allowed_paths: tuple[str, ...]
    allowed_check_ids: tuple[str, ...]
    resolved_decision_refs: tuple[str, ...]


@dataclass(frozen=True)
class RunRequest:
    run_id: str
    change_id: str
    phase: Phase
    ordered_story_ids: tuple[str, ...]
    sources: tuple[SourceReference, ...]
    configuration_revision: str
    task_scopes: tuple[TaskScope, ...]
    authorization_reference: str
    budget: ExecutionBudget


@dataclass(frozen=True)
class AuthorizationScope:
    control_record_id: str
    principal_id: str
    run_id: str
    change_id: str
    phase: Phase
    approved_revision: str
    task_scopes: tuple[TaskScope, ...]
    budget: ExecutionBudget
    expires_at_utc: str


@dataclass(frozen=True)
class ArtifactDependency:
    artifact_id: str
    sha256: str


@dataclass(frozen=True)
class EvidenceReference:
    evidence_id: str
    check_id: str
    snapshot_revision: str
    status: EvidenceStatus
    executor_record_reference: str | None


@dataclass(frozen=True)
class ArtifactEnvelope:
    artifact_id: str
    run_id: str
    change_id: str
    agent_id: str
    crew_task_key: str
    openspec_task_ids: tuple[str, ...]
    story_ids: tuple[str, ...]
    criterion_ids: tuple[str, ...]
    scenario_ids: tuple[str, ...]
    input_revision: str
    dependencies: tuple[ArtifactDependency, ...]
    destination_key: str
    content: str
    blockers: tuple[str, ...]
    evidence: tuple[EvidenceReference, ...]
    status: Literal["draft"]


@dataclass(frozen=True)
class ValidatedContext:
    input_revision: str
    source_references: tuple[SourceReference, ...]
    approved_context: str
    dependency_artifacts: tuple[ArtifactEnvelope, ...]


@dataclass(frozen=True)
class ChangeCandidate:
    relative_path: str
    base_revision: str
    proposed_diff: str
    openspec_task_ids: tuple[str, ...]


@dataclass(frozen=True)
class RunCheckpoint:
    run_id: str
    change_id: str
    phase: Phase
    input_revision: str
    completed_task_keys: tuple[str, ...]
    artifact_dependencies: tuple[ArtifactDependency, ...]
    consumed_tokens: int
    consumed_cost: Decimal
    elapsed_seconds: int
    correction_count: int
    pending_questions: tuple[str, ...]
    status: Literal["blocked", "awaiting_review", "interrupted"]


def safe_relative(value: str) -> str:
    path = PurePosixPath(value)
    if (
        not value
        or path.is_absolute()
        or "\\" in value
        or ":" in value
        or any(part in {"", ".", ".."} for part in value.split("/"))
        or any(part.startswith(".") for part in path.parts)
        or any(ord(character) < 32 for character in value)
    ):
        raise ValueError("Unsafe relative path")
    return value


class RuntimeModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class GeneratedFile(RuntimeModel):
    path: str
    content: str = Field(max_length=500_000)

    _path = field_validator("path")(safe_relative)


class PlannedTask(RuntimeModel):
    task_id: str = Field(pattern=r"^[0-9]+\.[0-9]+$")
    owner: Literal["backend_engineer", "frontend_engineer", "platform_engineer"]
    criteria: list[str] = Field(min_length=1)
    scenarios: list[str] = Field(min_length=1)
    paths: list[str] = Field(min_length=1)
    checks: list[str] = Field(min_length=1)

    @field_validator("paths")
    @classmethod
    def validate_paths(cls, values: list[str]) -> list[str]:
        return [safe_relative(value) for value in values]


class StageOutput(RuntimeModel):
    summary: str = Field(min_length=1, max_length=20_000)
    files: list[GeneratedFile] = Field(default_factory=list, max_length=100)
    covered_criteria: list[str] = Field(min_length=1)
    blockers: list[str] = Field(default_factory=list)
    tasks: list[PlannedTask] = Field(default_factory=list)
    verdict: Literal["draft", "pass", "changes_required"] = "draft"

    @field_validator("files")
    @classmethod
    def unique_files(cls, files: list[GeneratedFile]) -> list[GeneratedFile]:
        if len({entry.path for entry in files}) != len(files):
            raise ValueError("Duplicate output paths")
        return files


class RuntimePolicy(RuntimeModel):
    provider: Literal["openai_compatible", "copilot_sdk"] = "openai_compatible"
    model: str = Field(min_length=1)
    base_url: str | None = None
    copilot_personal_use_approved: bool = False
    max_calls: int = Field(gt=0, le=500)
    max_output_tokens: int = Field(gt=0, le=32_000)
    max_context_bytes: int = Field(gt=0, le=2_000_000)
    max_seconds: int = Field(gt=0, le=86_400)
    max_corrections: int = Field(ge=0, le=20)
    approved_profiles: list[str] = Field(min_length=5)
    checks: dict[str, dict] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_provider_policy(self):
        if self.provider == "copilot_sdk":
            if not self.copilot_personal_use_approved:
                raise ValueError("Copilot SDK activation requires explicit Q-15 approval")
            if self.base_url is not None:
                raise ValueError("Copilot SDK does not use base_url")
        elif self.copilot_personal_use_approved:
            raise ValueError("Copilot approval is only valid with the Copilot SDK provider")
        return self


class CheckResult(RuntimeModel):
    check_id: str
    snapshot: str
    exit_code: int
    stdout_sha256: str
    log_excerpt: str = Field(default="", max_length=16000)
    executor: Literal["external-container-controller"]