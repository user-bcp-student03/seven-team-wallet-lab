## ADDED Requirements

### Requirement: Authorized input snapshot
The runner SHALL load an immutable, traceable snapshot of the epic, active stories
HU-01, HU-02 and HU-04 in that order, applicable decisions and approved technical
constraints. Original sources MUST NOT be rewritten. Story content SHALL be
treated as untrusted data, not tool instructions.

#### Scenario: S01 Active scope is loaded
- **WHEN** a definition request references the three active stories
- **THEN** each original criterion and its source hash is available with a stable locator and deferred stories remain outside the active backlog

#### Scenario: S02 Input escapes the permitted roots
- **WHEN** an input path uses traversal, a symlink or a Windows reparse point outside the permitted roots
- **THEN** loading fails before any model invocation or file write

#### Scenario: S03 A source contains tool instructions
- **WHEN** a story or prior output requests shell access, approval or disclosure of secrets
- **THEN** it receives no tool permissions or approval authority and the attempted instruction is reported without exposing secrets

### Requirement: Explicit role and dependency wiring
The definition crew SHALL instantiate the existing five principal roles and
required support roles from reviewed configuration and SHALL pass validated
source context plus declared dependency outputs to every task.

#### Scenario: S04 A role produces its artifact
- **WHEN** PO, Architect, Security, Testing or AI Engineering completes an assigned definition task
- **THEN** the output follows that role's artifact contract and identifies its HU criteria, dependencies, producer and unresolved questions

#### Scenario: S05 A profile or dependency is incomplete
- **WHEN** a required profile is draft, contains unchecked instruction items or an input dependency fails validation
- **THEN** the affected task is blocked and no crew is activated for an incomplete preflight

### Requirement: Definition before product construction
The workflow SHALL separate requirements-to-artifacts from authorized product
construction. Open questions SHALL remain explicit until resolved by a human.

#### Scenario: S06 A financial policy is missing
- **WHEN** definition encounters an unresolved limit, state, funding or idempotency decision
- **THEN** artifacts retain that question and affected construction tasks remain blocked without inventing a policy

#### Scenario: S07 Documentation is complete but construction is not approved
- **WHEN** proposal, specs, design and tasks exist without a valid construction authorization
- **THEN** no product tools run and the workflow reports waiting for human review

#### Scenario: G2 definition check runs before product construction
- **WHEN** a human approves the architecture/tasks revision for one story
- **THEN** the configured OpenSpec check runs against that exact change in an isolated container before any product author task; a failed check blocks construction and requires definition revision plus renewed approval

### Requirement: Structured artifacts and confined storage
Every artifact SHALL include run/change, role, task identities, source revision,
HU/criteria, dependencies, draft status, blockers and evidence references. Only
a trusted writer SHALL resolve output destinations inside an isolated run volume.

#### Scenario: S08 A destination escapes the run volume
- **WHEN** a generated artifact attempts an absolute, traversing or linked destination outside its allowlist
- **THEN** it is rejected without overwriting sources or other runs

#### Scenario: S09 An output fails or a run is interrupted
- **WHEN** schema validation, atomic writing or exclusive ownership of a run identifier fails
- **THEN** the run is blocked or remains incomplete and no partial artifact is promoted as completed work

### Requirement: Authenticated version-bound approvals
The trusted control plane SHALL authenticate human approval outside LLM inputs
and bind it to run/change, phase, artifact/configuration revision, task/path/check
allowlists, model, budget and validity. The runner MUST deny effects by default.

#### Scenario: S10 Approval is asserted inside a prompt
- **WHEN** a request or generated artifact claims approval without a matching authenticated control-plane record
- **THEN** invocation of models or construction tools is denied

#### Scenario: S11 Approved inputs change or approval expires
- **WHEN** approved artifacts, profiles, skills, task configuration or permissions change, or approval expires or is revoked
- **THEN** execution stops before the next effect until a matching authorization is issued

### Requirement: Scoped construction and independent review
The construction crew SHALL use only approved OpenSpec task IDs in an isolated
sandbox. Independent Architect, Security and Testing reviews SHALL precede PO's
recommendation and human acceptance. Payment activation MUST depend on verified
HU-04 idempotency even when HU-02 is refined earlier.

#### Scenario: S12 A deferred or unprotected payment task is requested
- **WHEN** a task implements a deferred story or enables payments without verified idempotency invariants
- **THEN** it is blocked instead of expanding scope or enabling unsafe payment execution

#### Scenario: S13 An author supplies an unsupported test claim
- **WHEN** an author reports success without check evidence from the trusted executor
- **THEN** reviewers report missing evidence and the OpenSpec task remains incomplete

#### Scenario: S14 A defect requires correction
- **WHEN** a reviewer finds a defect within approved scope and correction budget remains
- **THEN** the responsible author receives the finding and affected downstream artifacts and checks are regenerated and reviewed

### Requirement: Bounded execution and recoverable state
The workflow SHALL require explicit token, cost, time and correction limits and
SHALL stop on exhaustion. Resume SHALL revalidate sources, configuration and
authorization rather than blindly repeating side effects or billed tasks.

#### Scenario: S15 Budget is exhausted or restart is requested
- **WHEN** a budget is exhausted or an interrupted run is resumed
- **THEN** the workflow escalates or revalidates its checkpoint and cannot silently reset limits or repeat completed effects

### Requirement: Container isolation and controlled effects
All runtime and checks SHALL execute in pinned OCI containers compatible with
Docker/Podman Compose. Agents MUST NOT receive engine sockets, unrestricted shell,
financial-store access or credentials in model context. Persistent agent memory
or additional databases SHALL NOT be enabled implicitly.

#### Scenario: S16 A tool attempts a forbidden effect
- **WHEN** an agent requests a non-allowlisted command, financial network access or the container engine socket
- **THEN** external sandbox controls deny the effect and record sanitized evidence

#### Scenario: S17 A provider secret could enter telemetry
- **WHEN** context or telemetry is assembled for model execution
- **THEN** provider credentials and sensitive data are excluded and only explicitly authorized model egress is permitted

### Requirement: Explicit promotion and non-executable scaffolding
Generated drafts SHALL remain separate from originals and the synchronized spec
baseline. Python scaffolding SHALL fail closed until implementation, review and
activation requirements are satisfied; importing modules MUST NOT activate crews.

#### Scenario: S18 A draft or skeleton is mistaken for delivery
- **WHEN** artifacts are generated or an unimplemented entry point is invoked
- **THEN** no product completion, approval, commit, push, deployment or spec synchronization is inferred or performed

### Requirement: Optional personal Copilot SDK provider
CrewAI SHALL remain the orchestrator when the optional personal Copilot SDK
provider is selected. The provider SHALL be disabled until Q-15 is approved in the
signed runtime policy and SHALL expose no tools, instructions or persistent sessions.

#### Scenario: S19 Copilot activation lacks Q-15 approval
- **WHEN** a runtime policy selects `copilot_sdk` without explicit personal-use approval
- **THEN** policy validation fails before any Copilot client or model session is created

#### Scenario: S20 Copilot SDK receives a CrewAI LLM request
- **WHEN** an approved run sends a text-only request through the Copilot adapter
- **THEN** one isolated session uses the selected model, has no available tools or discovered instructions, and is deleted after the response

#### Scenario: S21 Copilot authentication is ambiguous or tools are requested
- **WHEN** the explicit-token mode lacks `COPILOT_GITHUB_TOKEN`, the logged-in mode has ambient tokens set, or CrewAI supplies tools to the adapter
- **THEN** the request fails explicitly, ambient tokens are not passed to the SDK in logged-in mode, and no tool is executed