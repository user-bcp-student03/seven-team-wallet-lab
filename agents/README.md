# Agentes CrewAI

[Runner Python ejecutable](runner/README.md) con Agent/Task/Crew/Flow nativos,
gates humanos y checks externos. CrewAI se instala solo en la imagen OCI.
Usar la CLI wallet-agents o el controlador PowerShell, no `crewai run`.
No se han llamado modelos reales ni construido aplicaciones wallet.

Alcance del contexto y backlog: HU-01 -> HU-02 -> HU-04. HU-03/HU-05/HU-06
quedan diferidas. La busqueda de movimientos/conceptos usa Meilisearch como
proyeccion de PostgreSQL; ninguna herramienta de agente accede a datos financieros.
El runner y los checks se ejecutan en contenedores OCI, mediante Compose
compatible con Docker y Podman Desktop, sin runtimes de producto en el host.

## Contenido

- [Roles](config/agents.yaml): cinco agentes principales y cuatro de apoyo.
- [Perfiles de especialistas](flows/README.md#agentes-y-perfiles-de-instrucciones):
  PO, AI Engineering, Testing, Arquitecto y Security configurados para revisar en G0.
- [Skills](skills/README.md): capacidades reutilizables, una carpeta por skill.
- [Asignaciones de skills y perfiles](config/skill-bindings.yaml): manifiesto
  propio del proyecto, no un campo nativo de CrewAI.
- [Tareas de definicion](config/definition-tasks.yaml): refinamiento y diseno.
- [Tareas de construccion](config/construction-tasks.yaml): contratos de ejecucion
  supervisada, no autorizacion para empezar.
- [Flujo y gates](flows/README.md): etapas y responsabilidad humana.
- [Runner y contratos](runner/README.md): fuentes -> artefactos -> construccion
  autorizada, con contratos, CLI, contenedores y pruebas offline.
- [Cambio del runner](../openspec/changes/add-crewai-wallet-orchestration/proposal.md):
  propuesta aprobada para implementar; tareas y limites de activacion vigentes.
- [Evidencia de ejecucion](runs/README.md): contrato de resultados futuros.

Se usa el formato YAML clasico de CrewAI (agentes con role/goal/backstory y tareas
con description/expected_output/agent/context). crew.py realiza carga explicita
y flow.py controla las transiciones. Los YAML por si solos no crean
crews, inyectan archivos, asignan permisos ni implementan aprobaciones.

## Agentes principales

| Rol | ID CrewAI | Perfil de instrucciones |
| --- | --- | --- |
| PO | product_analyst | [specialists/po.md](specialists/po.md) |
| AI Engineering | ai_engineer | [specialists/ai-engineering.md](specialists/ai-engineering.md) |
| Testing | quality_reviewer | [specialists/testing.md](specialists/testing.md) |
| Arquitecto | solution_architect | [specialists/architect.md](specialists/architect.md) |
| Security | security_reviewer | [specialists/security.md](specialists/security.md) |

Apoyos conservados: ledger_specialist, backend_engineer, frontend_engineer y
platform_engineer. Los nueve roles se definen una sola vez en config/agents.yaml;
las tareas usan esos IDs. Los cinco perfiles tienen estado configured, no son
archivos de agentes de Copilot ni conceden permisos de ejecucion.

El manifiesto skill-bindings.yaml version 2 conserva agents como mapa de skills
y agrega instruction_profiles como mapa de ID -> ruta de perfil relativa a la
raiz del repositorio. Este contrato es propio del laboratorio: no pasar estas
claves al constructor Agent de CrewAI. El runner valida rutas, IDs,
revision y estado de cada perfil antes de cargarlo; bloquea borradores o
instrucciones incompletas. Cambiar una etiqueta draft por si sola no constituye
aprobacion. Las carpetas no activan descubrimiento ni ejecucion automatica.

## Contexto del runner

Entradas comunes: `change_id` y `approved_context`. Esta ultima es contenido
autorizado y sanitizado de fuentes, specs, diseno, tareas y ADR, no una simple
ruta que el LLM tenga que abrir ni una declaracion de aprobacion confiable.
El runner verifica las aprobaciones por separado antes de invocar modelos/tools.

En definicion, el contexto puede incluir borradores claramente etiquetados. En
construccion, debe incluir las versiones aprobadas, IDs exactos de tareas,
allowlist de rutas, escenarios y comandos de prueba autorizados. Las tareas
CrewAI no reemplazan ni duplican el backlog: los IDs y estado viven en OpenSpec.

## Limites y activacion

- Denegar por defecto shell, red externa, escritura y lectura de secretos.
- Validar rutas canonicas, symlinks y herramientas; bloquear escapes del workspace.
- Mantener repositorio/credenciales del producto fuera del contexto LLM.
- Habilitar escritura solo en worktree/sandbox y rutas de la tarea aprobada.
- No montar socket Docker/Podman en agentes; lifecycle/build bajo control externo.
- Fijar modelo/proveedor/versions, limite de tokens/coste, tiempo y reintentos (Q-15/Q-16).
- Configurar `allow_delegation: false`; no construir cadenas de agentes ilimitadas.
- Separar autor, revisor y aprobador humano. No aceptar autoaprobacion.
- Validar salidas con esquema y checks deterministas, no solo evaluacion por LLM.
- No conceder permisos por `human_input` ni porque una descripcion diga aprobado.

Los agentes producen candidatos de archivos completos sin herramientas. El
writer confiable aplica las rutas aprobadas dentro del run, y el controlador
externo ejecuta los checks. No se modifica el repositorio ni se concede shell
al LLM. Ver en el manual los limites pendientes: egress del proveedor, coste
monetario, imagenes de checks y validacion del producto real.

## Referencias

- [CrewAI Agents](https://docs.crewai.com/en/concepts/agents)
- [CrewAI Tasks](https://docs.crewai.com/en/concepts/tasks)
- [CrewAI Flows](https://docs.crewai.com/en/concepts/flows)
- [ADR-0006](../architecture/adr/0006-spec-driven-agent-orchestration.md)