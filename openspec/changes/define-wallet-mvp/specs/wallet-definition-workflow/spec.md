## ADDED Requirements

### Requirement: Traceability to original user stories
The definition workflow SHALL preserve the original epic and six user stories
and SHALL map every acceptance criterion of active HU-01, HU-02 and HU-04 to
a proposed scenario and later task, in that sequence without renumbering IDs.
HU-03, HU-05 and HU-06 SHALL remain deferred reference sources.

#### Scenario: A criterion is not covered
- **WHEN** a reviewer finds an active HU acceptance criterion without a scenario or task mapping
- **THEN** the definition is reported as incomplete and is not approved for construction

#### Scenario: Original source is imported
- **WHEN** the repository imports the supplied requirement files
- **THEN** names, relative links and file content remain unchanged and are checked against the source

#### Scenario: A deferred story is proposed for construction
- **WHEN** a task implements QR commerce, support disputes or daily reconciliation from a deferred HU
- **THEN** it is excluded from the active backlog pending an explicit scope change

#### Scenario: Payment delivery precedes the idempotency story review
- **WHEN** HU-02 is considered for delivery in the requested sequence
- **THEN** payment execution remains gated on verified financial idempotency invariants

### Requirement: Explicit unresolved policy decisions
The workflow SHALL record unresolved financial, identity, security and analytics
decisions with an owner and affected criteria and MUST NOT invent an approved policy.

#### Scenario: A task depends on an unresolved decision
- **WHEN** a proposed implementation task depends on an open question
- **THEN** the task is blocked pending human resolution while unrelated definition work may continue

### Requirement: Human approval before agent construction
The future orchestration runner SHALL require explicit human approval bound to
the change identifier, artifact version and permitted scope before construction.
Documentation or an LLM response alone MUST NOT authorize tool execution.

#### Scenario: No valid approval exists
- **WHEN** a construction run is requested without a matching human approval
- **THEN** the runner rejects the run without invoking construction tools

#### Scenario: Approved artifacts change
- **WHEN** a material spec, design or task changes after approval
- **THEN** the previous approval is invalidated and renewed review is required

### Requirement: Evidence-based task completion
The workflow SHALL distinguish generated artifacts, executed checks and human
acceptance and SHALL keep pending tasks unchecked until their evidence exists.

#### Scenario: An agent only produces a report
- **WHEN** a task requires executable verification but the agent produces only explanatory text
- **THEN** the task remains incomplete and the missing verification is reported

### Requirement: Laboratory boundaries
The workflow SHALL constrain the case study to synthetic data and fictitious
funds, with no external or simulated payment or KYC providers: payments are
internal transfers between wallet contacts settled in the ledger, and identity is
a users table with hashed passwords in PostgreSQL.

#### Scenario: A proposal requests a provider or real payment processing
- **WHEN** a change introduces real funds, an external or simulated provider, WireMock, an external identity provider or production credentials
- **THEN** the change requires an ADR, a separate scope and a security review before any integration is enabled

### Requirement: Containerized environment on Podman Desktop
The implementation design SHALL package the entire runnable environment in OCI
containers with Compose compatible with Docker and Podman Desktop, including
applications, PostgreSQL, Meilisearch, observability and
the CrewAI runner, without requiring product runtimes on the host.

#### Scenario: A local environment is prepared for execution
- **WHEN** the environment implementation is reviewed
- **THEN** it includes pinned images, persistent volumes, healthchecks, internal service networking and explicit Podman Compose provider validation

#### Scenario: Agent execution requests the engine socket
- **WHEN** a proposed agent container requests the Docker or Podman host socket
- **THEN** that permission is denied and container lifecycle stays outside agent-controlled tools