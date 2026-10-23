# Skills para agentes CrewAI

Catalogo de capacidades reutilizables del proyecto. Los agentes especializados
se definen en [config/agents.yaml](../config/agents.yaml), no en este directorio.
Su asignacion esta en [config/skill-bindings.yaml](../config/skill-bindings.yaml).
El manifiesto version 2 tambien enlaza los cinco perfiles principales mediante
instruction_profiles; ver [cascarones y flujo](../flows/README.md).
AI Engineering reutiliza skills de arquitectura/backend/frontend/plataforma sin
duplicarlas ni sustituir la revision independiente de Testing y Security.

| Skill | Responsable principal |
| --- | --- |
| [requirements-refinement](requirements-refinement/SKILL.md) | product_analyst |
| [wallet-architecture](wallet-architecture/SKILL.md) | solution_architect |
| [ledger-idempotency](ledger-idempotency/SKILL.md) | ledger_specialist |
| [application-security](application-security/SKILL.md) | security_reviewer |
| [java-backend](java-backend/SKILL.md) | backend_engineer |
| [angular-frontend](angular-frontend/SKILL.md) | frontend_engineer |
| [podman-observability](podman-observability/SKILL.md) | platform_engineer |
| [wallet-testing](wallet-testing/SKILL.md) | quality_reviewer |

Las asignaciones permiten compartir capacidades. Cada carpeta contiene un
SKILL.md con name, description, procedimiento y salida esperada. Agregar
references/, templates/ o scripts/ solo cuando haya recursos concretos: no
crear directorios vacios ni duplicar fuentes de requisitos.

## Contrato de carga futuro

skill-bindings.yaml es un manifiesto propio del laboratorio, no configuracion
nativa de Agent/Crew ni un mecanismo instalado de descubrimiento. El futuro
runner validara IDs, rutas canonicas y permisos; cargara instrucciones solo
cuando correspondan a la tarea aprobada. No pasar este manifiesto directamente
al constructor Agent ni asumir que CrewAI descubre estas carpetas por si solo.
Los perfiles de instrucciones viven en agents/specialists/ con estado draft;
completarlos y revisarlos es condicion previa para su activacion futura.

Las skills no conceden tools, shell, acceso a secretos ni permisos de escritura.
No reemplazan tareas OpenSpec, aprobaciones o tests. En esta fase no se ejecutan
agentes ni scripts; las verificaciones de runtime se declaran pendientes.

Este catalogo no es la configuracion de skills de GitHub Copilot. No se crean
agentes del editor ni se promete descubrimiento automatico desde agents/skills/.