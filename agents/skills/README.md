# Skills para agentes CrewAI

Catalogo de capacidades reutilizables del proyecto. Los agentes especializados
se definen en [config/agents.yaml](../config/agents.yaml), no en este directorio.
Su asignacion esta en [config/skill-bindings.yaml](../config/skill-bindings.yaml).
El manifiesto version 2 tambien enlaza los cinco perfiles principales mediante
instruction_profiles; ver [perfiles y flujo](../flows/README.md).
AI Engineering reutiliza skills de arquitectura/backend/frontend/plataforma sin
duplicarlas ni sustituir la revision independiente de Testing y Security.

| Skill | Responsable principal |
| --- | --- |
| [wallet-product-owner](wallet-product-owner/SKILL.md) | product_analyst |
| [wallet-architecture](wallet-architecture/SKILL.md) | solution_architect |
| [ledger-idempotency](ledger-idempotency/SKILL.md) | ledger_specialist |
| application-security (referencias: [acceso](application-security/wallet-access-control.md), [integridad de pagos](application-security/wallet-payment-integrity.md), [PostgreSQL](application-security/wallet-postgres-security.md), [Angular](application-security/angular-frontend-security.md), [sesion/token](application-security/wallet-session-token-security.md), [telemetria](application-security/wallet-telemetry-privacy.md)) | security_reviewer |
| [java-backend](java-backend/SKILL.md) | backend_engineer |
| [database](database/SKILL.md) | backend_engineer (sin asignar en bindings) |
| [angular-frontend](angular-frontend/SKILL.md) | AI Engineering y frontend_engineer (transversal) |
| [frontend-onboarding-hu01](angular-frontend/frontend-onboarding-hu01.md) | frontend_engineer |
| [frontend-payment-hu02](angular-frontend/frontend-payment-hu02.md) | frontend_engineer |
| [frontend-idempotency-hu04](angular-frontend/frontend-idempotency-hu04.md) | frontend_engineer |
| [podman-observability](podman-observability/SKILL.md) | platform_engineer |
| [test-plan-coverage](wallet-testing/test-plan-coverage/SKILL.md) | quality_reviewer |
| [automated-test-implementation](wallet-testing/automated-test-implementation/SKILL.md) | quality_reviewer |

Las asignaciones permiten compartir capacidades. Cada skill tiene un archivo
con name, description, procedimiento y salida esperada. Agregar
references/, templates/ o scripts/ solo cuando haya recursos concretos: no
crear directorios vacios ni duplicar fuentes de requisitos.

La skill [wallet-architecture](wallet-architecture/SKILL.md) guia al Arquitecto
desde requerimientos y HU/CA hasta diagramas C4 C1/C2/C3 y contratos OpenAPI 3.1
con inputs/outputs, mensajes de exito/error, codigos HTTP y escenarios trazables.
Sus entregables se proponen dentro del cambio OpenSpec; no resuelven preguntas
abiertas ni acreditan una implementacion.

## Contrato de carga

skill-bindings.yaml es un manifiesto propio del laboratorio, no configuracion
nativa de Agent/Crew ni un mecanismo instalado de descubrimiento. El runner
valida IDs, rutas canonicas y permisos; carga instrucciones solo
cuando correspondan a la tarea aprobada. No pasar este manifiesto directamente
al constructor Agent ni asumir que CrewAI descubre estas carpetas por si solo.
Los perfiles viven en agents/specialists/ con estado configured. G0 exige su
revision y vinculacion a la configuracion concreta antes de activar el run.

Las skills no conceden tools, shell, acceso a secretos ni permisos de escritura.
No reemplazan tareas OpenSpec, aprobaciones o tests. CrewAI carga estos textos
como instrucciones; las pruebas offline del runner no acreditan el producto.

Este catalogo no es la configuracion de skills de GitHub Copilot. No se crean
agentes del editor ni se promete descubrimiento automatico desde agents/skills/.