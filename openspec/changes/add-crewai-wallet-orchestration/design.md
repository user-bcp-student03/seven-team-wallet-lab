# Diseno del runner CrewAI

## Context

El usuario aprobo implementar este runner; su runtime offline y Compose estan
implementados. No se han invocado modelos reales ni construido el producto.
Aplican AGENTS.md, Q-15/Q-16 y las restricciones de Angular, Java 21,
PostgreSQL/Meilisearch y OCI/Compose. La aprobacion de implementacion no aprueba
la ejecucion de modelos ni del producto.

## Goals / Non-Goals

Objetivo: especificar un recorrido repetible desde fuentes hasta artefactos y,
con autorizacion independiente, construccion y evidencia. No resolver preguntas
financieras, instalar runtimes en el host ni convertir reportes en aceptaciones.
No introducir persistencias implicitas por activar memoria/checkpoints de CrewAI.

## Decisions

### 1. Un Flow de control y dos crews

- main.py: entrada explicita; no llamar kickoff al importar modulos.
- flow.py: preflight, fase, handoffs, limites, estado y gates fuera del LLM.
- crew.py: fabrica nativa Agent/Task/Crew de definicion y de construccion,
  cargando YAML de config/ sin copiar roles a Python. No requiere un .py por rol.
- contracts.py: contratos de request, contexto, artefacto, evidencia y aprobacion.
- artifacts.py: adaptador de rutas, validacion y almacenamiento controlado.

La implementacion usa objetos nativos Agent/Task/Crew y CrewAI Flow 1.15.28 con
construccion explicita desde YAML, perfiles y skills. El wiring se prueba con un
LLM local fixture, no con proveedor remoto.

### 2. Entrada comun y contexto por rol

RunRequest identifica run_id, change_id objetivo, fase, HU ordenadas, revision de
fuentes/configuraciones/perfiles/skills, tareas OpenSpec y presupuesto aprobado.
Para construir incluye escenarios, destinos permitidos y checks por identificador.
Un presupuesto tiene modelo/endpoint explicitos y limites de tokens, coste, tiempo
y correcciones; no usar valores por defecto que autoricen gasto.

El loader confiable lee solo rutas canonicas permitidas. Valida traversal,
symlinks/reparse points, longitud, codificacion, hashes y ausencia de secretos.
La epica se etiqueta como contexto mas amplio, no backlog activo. Los criterios
originales se preservan con sus localizadores; un resumen no sustituye las fuentes.
Contenido de HU y salidas de agentes son datos no confiables, nunca instrucciones
de herramientas ni archivos Python/YAML para ejecutar.

approved_context se construye con contenido autorizado, no solo con rutas ni
afirmaciones de aprobacion dentro del prompt. Cada tarea recibe las fuentes
aplicables y las salidas validadas de todas sus dependencias context, conservando
procedencia y bloqueos. Si faltan criterios o no caben, detener/escalar sin truncar
silenciosamente la cobertura.

### 3. Definicion: fuentes a artefactos

Se reutiliza definition-tasks.yaml en orden:

1. PO: refine_requirements -> propuesta, delta specs y matriz HU/CA/escenario.
2. Arquitecto: design_architecture -> diseno, contratos API/datos, ADR/C4 propuestos.
3. Apoyo ledger: design_financial_integrity -> invariantes y matriz de fallos.
4. Security: review_security_design -> amenazas, controles y hallazgos.
5. Testing: define_test_strategy -> cobertura, fixtures propuestos y plan de checks.
6. AI Engineering: plan_delivery -> tareas OpenSpec y handoffs tecnicos.
7. Testing: plan_implementation -> revision de verificabilidad de esas tareas.
8. PO: review_product_scope -> revision de alcance y recomendacion al humano.

Las preguntas sin resolver permiten borradores etiquetados, no politicas
inventadas. Se conserva la secuencia HU-01 -> HU-02 -> HU-04, con diseno transversal
de idempotencia antes de proponer habilitar pagos.

### 4. Contratos de salida y escritura

Cada ArtifactEnvelope contiene run_id, change_id, rol, task_key CrewAI, IDs de
tareas OpenSpec, HU/CA, revision de inputs, artefactos dependientes, destinos
logicos, contenido, bloqueos, estado draft y referencias de evidencia. Los
destinos se resuelven por una tabla confiable del runner, nunca por rutas del LLM.
Artefacto generado, check realmente ejecutado y aceptacion son hechos distintos.

El paquete por ejecucion vive en agents/runs/<run_id>/, ignorado por Git salvo
su README. Es un volumen de salida separado; las fuentes permanecen de solo
lectura. La escritura exige rutas canonicas dentro del volumen, creacion segura
y reemplazo atomico; un estado interrumpido no se registra como tarea terminada.
El estado propuesto usa manifiestos JSON en ese volumen, no SQLite/LanceDB ni
memoria persistente automatica. Concurrencia sobre un mismo run_id se rechaza.

La promocion humana revisada propone diffs a proposal/specs/design/tasks del
cambio objetivo y a ADR/C4; no modifica originales ni la baseline openspec/specs.
El runner no hace commits, push, sincronizacion ni archivo automaticos.

### 5. Aprobacion y construccion

La autorizacion de ejecucion se recibe desde un canal de control confiable
separado del contenido de requisitos, salidas y volumen escribible por agentes.
Q-15 debe fijar su autenticacion, revocacion y custodia antes de implementarlo.
Un campo approved=true, un nombre de aprobador o un hash por si solos no autentican
una aprobacion. El rechazo es el comportamiento por defecto.

La autorizacion vincula identidad humana, run/change, fase, revision completa de
artefactos y configuraciones, tareas permitidas, rutas/checks, modelo/presupuesto
y periodo de validez. El Flow vuelve a comprobarla antes de cada efecto; cambios
materiales, revocacion, expiracion o agotamiento de presupuesto detienen el run.

La construccion usa construction-tasks.yaml sobre un cambio de producto acotado:
backend -> frontend -> plataforma -> AI Engineering/integracion -> Arquitecto ->
Security -> Testing -> PO/recomendacion. Son categorias de trabajo; el backlog y
la secuencia real se seleccionan por IDs OpenSpec aprobados, no por ejecutar ocho
tareas genericas sobre todas las HU de una vez. Apoyos no necesarios se excluyen
explicitamente; nunca se permite construir HU diferidas por una descripcion.

Los autores entregan candidatos/diffs en sandbox aislado. Un adaptador confiable
aplica solo cambios permitidos; los agentes no tienen shell libre ni un writer
generico. El controlador externo ejecuta checks previamente permitidos en
contenedores aislados con limites; tratar codigo generado como no confiable.
No ejecutar builds en el host ni pasar el socket del motor al runner/agentes.
Los revisores reciben un snapshot de solo lectura y evidencia del controlador,
no una afirmacion del autor de que las pruebas pasaron.

Una correccion devuelve el hallazgo al autor y revalida todos los dependientes
afectados. Se exige nueva evidencia y se invalida la revision anterior. Si cambia
el alcance/diseno/tareas aprobado, volver al gate humano antes de continuar.
Al agotar el limite aprobado, escalar; nunca usar delegacion recursiva ilimitada.

### 6. Contenedores, red y secretos

El perfil Compose actual usa usuario sin privilegios, rootfs de solo lectura,
volumen de salida separado, limites de recursos y sin puertos ni plano
financiero. El runner monta solo rutas fuente necesarias y material publico de
control; la clave privada Ed25519 vive en `.wallet-operator/` y solo se monta en
el servicio operador sin red. Los checks se lanzan con timeout de Podman,
`--network=none`, filesystem read-only y digest inmutable. Faltan lock transitive,
SBOM y digest de imagen base del runner.
Solo permitir egress al endpoint LLM aprobado mediante un control externo real;
un nombre de red Compose o una instruccion en prompts no constituye firewall.
Secretos de proveedor se entregan al cliente confiable, nunca a contexto, evidencia
o herramientas de agentes. El mecanismo exacto y la redaccion se cierran en Q-15.

Docker/Podman realizan lifecycle fuera del runner. El Compose del runner y el
controlador PowerShell estan integrados con orchestration/. La maquina Podman
fue verificada localmente. Logs usan IDs tecnicos y no prompts, PII, tokens o
contenido financiero. No acceso del runner a PostgreSQL/Meilisearch.

### 7. Copilot SDK personal como proveedor opcional

- CrewAI sigue controlando tareas, handoffs, presupuesto y gates; el SDK es solo
  un adaptador `BaseLLM`, no un segundo orquestador.
- `provider` conserva `openai_compatible` como default. `copilot_sdk` requiere
  `copilot_personal_use_approved: true` en la politica firmada de G0 y un modelo
  explicito; no usa `base_url`.
- El adaptador usa por defecto la sesion del usuario autenticado de Copilot
  (`COPILOT_USE_LOGGED_IN_USER=true`) y elimina los tokens ambientales del entorno
  del SDK; con `false` exige `COPILOT_GITHUB_TOKEN`. Nunca copia credenciales al
  contexto, al manifiesto ni a la evidencia. La sesion del host no es visible desde
  el contenedor Linux del runner: `Invoke-WalletFlow.ps1 -HostRunner` ejecuta solo el
  servicio `runner` en un venv Python 3.12 del host, sin la clave privada de firma
  (excepcion opcional a OCI que pierde su aislamiento; sujeta a Q-15).
- Cada llamada crea una sesion aislada; no se registran herramientas, se
  deshabilitan las herramientas integradas, la carga de instrucciones/skills,
  MCP, memoria de sesion y telemetria, y se elimina la sesion al terminar.
- La imagen fija `github-copilot-sdk` y descarga su runtime durante el build OCI,
  no durante una llamada. El egress de build y del proveedor sigue sujeto a Q-15.
- La prueba de este cambio usa un cliente simulado; no realiza llamadas Copilot.
  La activacion personal y la prueba con cuenta quedan bloqueadas hasta resolver
  Q-15. `max_output_tokens` no constituye un limite duro del SDK y la politica
  actual no define un tope monetario para una suscripcion.

## Risks / Trade-offs

- Salidas plausibles sin cobertura: contratos tipados y revision independiente.
- Prompt injection y escapes: permisos externos al LLM, loader/writer restringidos.
- Aprobacion obsoleta o falsificada: canal autenticado y snapshot/revalidacion.
- Coste/reintentos: presupuesto requerido y detencion controlada sin reinicio ciego.
- Falsa seguridad por contenedores: probar red, filesystem y lifecycle realmente.
- API CrewAI cambiante: Q-16 fija version y valida wiring sin ejecutar modelos.

## Migration Plan

Implementar y verificar offline la integracion aislada del Copilot SDK sin
llamadas reales. Antes de activar cualquier proveedor, revisar propuesta,
spec/diseno/tareas y resolver Q-15/Q-16; despues verificar contenedores y ejecutar
una definicion documental autorizada con su evidencia. Solo entonces evaluar un
cambio de producto acotado; no activar construccion por aprobar documentacion.

## Open Questions

Q-15/Q-16 siguen abiertas para activacion real; los perfiles estan en estado
configured, pendientes de revision G0 por run. Las decisiones Q-01..Q-17
aplicables al producto no se cierran aqui. Ver
[registro de preguntas](../../../docs/requirements/open-questions.md).