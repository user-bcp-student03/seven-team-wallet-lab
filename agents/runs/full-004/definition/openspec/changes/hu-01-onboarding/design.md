# Diseño — hu-01-onboarding

## Estado, fuentes y alcance

**Estado:** borrador de arquitectura para revisión; no es una aprobación ni evidencia de implementación. Aplica solo a HU-01. Conserva HU-01/CA1–CA6 y la secuencia HU-01 → HU-02 → HU-04. HU-03, HU-05 y HU-06 quedan diferidas. El caso de estudio usa datos y dinero ficticios; no incorpora proveedores reales o simulados.

**Fuentes revisadas en el contexto autorizado:** HU-01 y sus CA1–CA6; `BUSSINESS_RULES.md` (onboarding, login y tecnología/navegadores); decisiones de laboratorio registradas Q-01, Q-11 y Q-16; decisiones delegadas de laboratorio Q-02, Q-03 y Q-13 en los artefactos refinados; arquitectura objetivo, ADR-0001–0007 y registro de preguntas. Los originales no se modifican. Q-02/Q-03/Q-13 son decisiones solo para el laboratorio, no cierres formales ni políticas de producción.

**Restricción de esta entrega:** se generan únicamente `design.md`, `architecture/c4.md` y `api/openapi.yaml`. Los cambios a ADR se proponen aquí; no se editan los ADR compartidos. No se construyen aplicaciones, Compose ni runner.

## Decisiones y supuestos

- **Acordado en la arquitectura base:** Angular responsive; Java 21/Spring Boot en monolito modular; Clean Architecture; PostgreSQL como fuente autoritativa; Meilisearch solo para proyección eventual de movimientos y conceptos; identidad propia con hash de contraseña y sesión de servidor; ejecución objetivo mediante OCI/Compose compatible con Podman Desktop. Las vistas describen arquitectura objetivo, no despliegue comprobado.
- **Decisión registrada Q-01:** DNI de 8 dígitos, celular de 9 dígitos, correo con dominio válido, unicidad de DNI/celular/correo y validación interna sintética, sin KYC externo. DNI duplicado produce «El cliente ya existe». Alta correcta produce «El cliente fue creado con éxito» y Home del Wallet.
- **Decisión registrada Q-11:** contraseña alfanumérica de 8–20 caracteres; hash Argon2id o equivalente aprobado; bloqueo de 15 minutos tras 5 intentos fallidos; sesión de servidor con 30 minutos de inactividad; mensaje de login «Datos incorrectos»; sin MFA ni recuperación de cuenta. La recuperación no se añade a HU-01.
- **Decisión registrada Q-16:** Java 21, Spring Boot 4.1.2, Angular 21.2.x, Node 24, PostgreSQL 18.6, Meilisearch 1.55.0 y podman-compose; imágenes se fijarán por digest al crear esqueletos. Este documento no verifica versiones instaladas.
- **Decisión delegada (caso de estudio), Q-02:** eventos `onboarding_started`, `onboarding_step_completed` y `onboarding_closed`; 30 minutos de inactividad cierra como abandono. La duración de una finalización exitosa se mide desde el primer inicio hasta el cierre exitoso; la mediana usa finalizaciones exitosas de la cohorte/periodo. Justificación: frontera repetible sin atribuir duración a abandonos. No verificada.
- **Decisión delegada (caso de estudio), Q-03:** activación para el reporte equivale a alta completada; nuevos usuarios activos se deduplican por usuario y mes de activación. CAC = gasto de adquisición atribuido al periodo/cohorte / nuevos usuarios activos atribuidos. Si falta gasto o denominador, se informa desconocido, no cero. Justificación: evita presentar datos ausentes como resultados. Los objetivos originales de MAU 1,000–2,000 y CAC PEN 10 se conservan; no se afirma haberlos alcanzado.
- **Decisión delegada (caso de estudio), Q-13:** retención de eventos analíticos de onboarding por 90 días y reportes agregados con datos sintéticos. Justificación: limita la retención del laboratorio; no es una política de producción.
- **Propuesta de diseño, no decisión registrada:** tres pasos de interfaz: identificación (DNI), contacto (celular y correo), y credenciales (contraseña); el resumen permite corregir antes de Registrar. Solo el servidor confirma el alta. El paso actual se mantiene visible. Esta partición no cambia campos ni reglas de negocio.
- **Pregunta que bloquea construir el alta:** la HU/regla de negocio exige un mensaje explícito ante DNI duplicado y éxito inmediato con Home; la revisión de seguridad exige que alta, verificación y recuperación no revelen la existencia de celular/correo mediante respuesta o tiempo. Una alta exitosa y una colisión única no pueden producir el mismo resultado observable si el éxito crea una sesión y navega a Home. Definir una respuesta/flujo que preserve CA3 y el mensaje DNI sin enumeración; no afirmar que el contrato actual elimina esa filtración. No se incorpora verificación o recuperación nueva. Esta cuestión requiere decisión de producto y revisión de Security antes de construir el endpoint de alta.
- Q-12 y Q-14 siguen pendientes según el registro; no se inventan SLO, frescura ni ventana de medición adicional. La fórmula delegada de Q-03 no aporta gasto de adquisición: sin una fuente de gasto disponible, CAC queda desconocido.

## Límites y dependencias Clean Architecture

Monolito modular con módulos `identity-onboarding`, `analytics`, `payments`, `wallet-ledger` y `movement-search`. HU-01 usa `identity-onboarding` y la escritura de eventos analíticos a través de un puerto; no depende de Meilisearch. `payments` y `wallet-ledger` son dependencias futuras de HU-02/HU-04, no son ejecutadas por el alta.

En `identity-onboarding`: dominio Java puro para identidad, reglas de formato, unicidad lógica y activación; casos de uso `RegisterCustomer` y `AuthenticateCustomer`; puertos de repositorio, hash de clave, sesión, reloj y publicación durable de eventos; adaptadores Spring MVC/Security, PostgreSQL/Flyway y hash de contraseña. El dominio no importa Spring, JPA, HTTP ni adaptadores. Controladores traducen contratos REST a comandos; validación de formato en servidor y formularios Angular no sustituyen esa validación.

El alta escribe usuario, wallet activa según la regla del laboratorio y eventos requeridos en PostgreSQL dentro de una frontera local explícita. Restricciones UNIQUE de DNI, teléfono normalizado y correo normalizado resuelven carreras; una violación revierte la operación completa. La sesión se establece solo después de confirmar el alta. No se consultan tablas de otro módulo por atajo: los módulos exponen puertos/casos de uso; las migraciones y permisos limitan escrituras a los propietarios de cada esquema. La consulta de sesión/identidad usa PostgreSQL autoritativo.

La UI muestra errores accionables por campo y conserva los valores no secretos. Contraseñas nunca se registran, devuelven ni persisten en claro; no se envían identificadores de propietario desde el cliente. El identificador de usuario se deriva de la sesión autenticada. Los mensajes, logs y métricas no contienen DNI, celular, correo, contraseña, cookies ni tokens.

## Contratos REST y eventos

El detalle tipado está en [`api/openapi.yaml`](api/openapi.yaml). Operaciones propuestas:

- `GET /api/v1/csrf`: obtiene token CSRF para el cliente Angular; no autentica.
- `POST /api/v1/onboarding/registrations`: alta atómica; datos de identidad y credenciales en JSON. Respuesta de alta y colisiones según OpenAPI, pendiente de resolver la tensión de enumeración indicada arriba.
- `POST /api/v1/sessions`: login con DNI y contraseña; éxito crea sesión de servidor; fallo usa mensaje genérico «Datos incorrectos». Bloqueo Q-11 no revela si la cuenta existe.
- No hay endpoints de comprobación de existencia de celular/correo ni recuperación en esta HU. Si se añaden más adelante, requieren la misma revisión de no enumeración.

Autenticación: sesión de servidor en cookie `HttpOnly`, `Secure` y `SameSite` apropiado al despliegue; operaciones mutables exigen token CSRF en header. La política exacta de dominio/origen se configura por entorno OCI. Angular mantiene el token CSRF en memoria; no persiste credenciales o tokens de sesión en almacenamiento del navegador. Solo la identidad autenticada determina ownership. No se decide aquí 403 frente a 404 para recursos de terceros porque HU-01 no expone operaciones por objeto.

Eventos internos versionados, escritos en el outbox PostgreSQL propiedad de `identity-onboarding` en la misma transacción que el hecho de negocio aplicable:

| Evento | Emisión | Campos mínimos | Privacidad/consumidor |
| --- | --- | --- | --- |
| `onboarding_started.v1` | Inicio del flujo | `eventId`, `flowId` seudónimo, `occurredAtUtc`, versión | No PII; analytics |
| `onboarding_step_completed.v1` | Cada paso válido completado | Campos anteriores, `stepCode` de lista cerrada | No valor de campos; analytics |
| `onboarding_closed.v1` | Éxito o abandono por inactividad | Campos anteriores, `outcome` (`completed`/`abandoned`) | Solo fin de flujo; analytics |

El productor y consumidor deduplican por `eventId`; timestamps UTC. Inicio y finalización de un paso se guardan al confirmar el evento de negocio. El cierre por inactividad usa el reloj del servidor y un proceso del mismo despliegue; no hay broker. El worker entrega con reintentos acotados y checkpoint durable. La analítica no altera activación ni saldo. Eventos fallidos quedan observables para recuperación, sin convertir el evento en éxito financiero.

## Datos, almacenamiento e idempotencia futura

PostgreSQL es autoridad para identidad, estado de onboarding, sesiones, restricciones de unicidad y outbox. Aplicar migraciones Flyway versionadas, claves foráneas, UNIQUE/CHECK adecuados y permisos mínimos por módulo. Seudonimizar `flowId`; limitar los atributos analíticos a los enumerados. Retención de 90 días para los eventos sintéticos es decisión delegada Q-13; retención de identidad, auditoría y datos reales no queda definida por esa decisión.

Meilisearch no participa en HU-01. En HU-02 será solo read model reconstruible de movimientos/conceptos según ADR-0007 y Q-17; no es autoridad para identidad, ownership, saldo ni idempotencia. La indexación futura se alimenta desde outbox PostgreSQL, nunca mediante dual write financiero. El navegador no accede al índice ni posee credenciales.

**HU-04, contrato de diseño futuro (no implementado por esta HU):** clave UUID generada por el cliente en `Idempotency-Key`, obligatoria al mover/reservar fondos; ámbito según decisión Q-07 registrada: pagador autenticado + clave. Misma clave y mismo fingerprint reproduce referencia y resultado originales; mismo UUID con payload distinto devuelve 422 sin movimiento; una solicitud concurrente espera con límite y puede terminar en 409 si vence; crash antes del commit no deja efectos y el mismo reintento puede procesarse como primera ejecución. Replay de 24 h; clave y evidencia original/reintento se conservan mientras exista el pago; pasada la ventana, una clave reutilizada se rechaza y nunca ejecuta otro cargo. La referencia es estable para la intención. No se incluye operación de pago en el OpenAPI de HU-01.

El fingerprint futuro será hash versionado de representación canónica de importe decimal exacto, moneda y destino normalizado, sin PII en claro. Validar clave y fingerprint en adaptador de entrada; persistirlos en PostgreSQL, nunca en memoria, Meilisearch o Redis. Tabla de idempotencia propiedad de `payments`, UNIQUE sobre ámbito, con fingerprint, estado Q-05, referencia, resumen original y timestamps UTC. Q-05 registrado define estados terminales `EXITOSO`, `FALLIDO`, `EXPIRADO`; no inventar otros estados. Tabla de evidencia conserva vínculo original/reintento para HU-04 CA4.

Cuando HU-02/HU-04 habiliten pagos, la reserva de clave, operación, débitos/créditos balanceados e inmutables, transición terminal y fila outbox deben confirmarse en una única transacción PostgreSQL; sin llamadas externas. `wallet-ledger` es dueño de asientos y `payments` de idempotencia/operación; la coordinación es un caso de uso con transacción local, sin que un módulo escriba tablas de otro por atajo. Inserción de clave al inicio con UNIQUE y manejo explícito de conflicto; bloqueo de cuentas en orden estable de identificador para reducir deadlocks y evitar doble gasto. La evidencia de conflicto/replay no crea asientos. Destino debe ser contacto del pagador conforme Q-18. El pago no depende del worker.

Soporte futuro reflejado en C2/C3: Flyway para esquema; filtro/adaptador de idempotencia; worker outbox del mismo despliegue; política de retención que aplica Q-07 sin borrar evidencia necesaria; métricas de replay, conflicto, backlog e invariantes con labels de baja cardinalidad; harness Testcontainers PostgreSQL para concurrencia, replay, conflicto, crash/restart; ArchUnit para límites. El runner de pruebas disponible en el contexto del repositorio indica que los checks backend usan PostgreSQL efímero local y no Testcontainers; distinguir esa evidencia de la estrategia futura. No usar Redis, broker, nueva base, WireMock o servicios externos.

Escenarios futuros HU-04, resultado esperado/evidencia: doble clic y concurrentes con misma clave producen una sola operación/asientos (PostgreSQL real); replay tras éxito o rechazo conserva el resultado y no duplica efectos; payload distinto con misma clave devuelve 422 sin asientos; intención igual con clave nueva es intención nueva; crash antes de commit no deja clave ni asiento y reintento crea como máximo una operación; timeout del cliente seguido del mismo UUID devuelve resultado original; destino ajeno a contactos y saldo insuficiente no mueven fondos; débitos concurrentes con claves distintas no dejan saldo negativo; reinicio y pérdida/reindexación Meilisearch no cambian clave/asientos. Ninguna de estas pruebas se afirma ejecutada en HU-01.

## Alternativas y tradeoffs

| Decisión | Alternativa | Beneficio de la propuesta | Coste/riesgo |
| --- | --- | --- | --- |
| Monolito modular con puertos/adaptadores | Microservicios | Transacción local, menos operación y límites explícitos | Disciplina de módulos y ownership de tablas necesarios |
| PostgreSQL + outbox para eventos | Dual write o broker | Atomicidad del hecho y del evento sin infraestructura extra | Worker, backlog y deduplicación requieren operación |
| Meilisearch solo para búsqueda eventual | Búsquedas financieras desde índice | Evita autorizar con proyección desactualizada | HU-01 no lo usa; HU-02 debe tolerar lag/reindexación |
| Sesión de servidor + CSRF | Token bearer persistido / IdP externo | Se ajusta a identidad propia y evita tokens persistidos en navegador | Gestión de sesión y CSRF en backend |
| Eventos mínimos sin PII | Registrar payload completo del formulario | Reduce exposición y permite métricas de funnel | No habilita análisis de campos personales; atribución de gasto no disponible aquí |

## Matriz de trazabilidad

| HU/CA | Fuente/requisito | Escenario | Componente | Operación/evento | Resultado | Guardrail | Evidencia esperada |
| --- | --- | --- | --- | --- | --- | --- | --- |
| HU-01/CA1 | HU-01 CA1; reglas web responsive | T-HU01-01: pasos y paso actual visibles en cada navegación válida | Angular `OnboardingFlow` | UI; sin endpoint | Secuencia y paso actual visibles | GR-01, GR-08 | `frontend-tests`; Edge/Chrome/Safari manual NO EJECUTADO |
| HU-01/CA2 | HU-01 CA2; Q-01/Q-11 | T-HU01-02: campo vacío/formato inválido bloquea avance y da corrección accionable | Angular forms; `RegisterCustomer` | `POST /onboarding/registrations` | Error de campo sin alta | GR-02, GR-07 | `frontend-tests`, `backend-tests` PostgreSQL |
| HU-01/CA2 | Q-01: unicidad y mensaje de DNI | T-HU01-03: DNI duplicado; colisiones únicas concurrentes; rollback; acceso entre sesiones | `identity-onboarding` | `POST /onboarding/registrations` | DNI duplicado reportado; como máximo una fila por identificador; rollback completo | GR-02, GR-07 | `backend-tests` PostgreSQL efímero |
| HU-01/CA3 | HU-01 CA3; Q-01; dependencia HU-02/HU-04 | T-HU01-04: alta válida activa wallet y lleva a Home; activación no habilita ejecución de pagos | `RegisterCustomer`, sesión, Angular Home | `POST /onboarding/registrations`; `Set-Cookie` | Usuario/wallet activos y Home; punto de pago no ejecutable hasta HU-02/HU-04 | GR-02, GR-08, GR-09 | `backend-tests`, `frontend-tests`; pagos fuera de esta HU |
| HU-01/CA4 | HU-01 CA4; decisión delegada Q-02 | T-HU01-05: inicio, un evento por paso y cierre ordenable | `identity-onboarding`, outbox, worker analytics | Eventos internos versionados | Eventos durablemente emitidos, sin PII | GR-04, GR-06 | `backend-tests`; no ejecutado |
| HU-01/CA5 | HU-01 CA5; decisión delegada Q-02 | T-HU01-06: 30 min inactivo cierra abandono; mediana usa inicios y cierres exitosos | Worker analytics | `onboarding_closed.v1` + agregado | Métrica comparable con 8 min y meta 3 min; sin afirmar logro | GR-04, GR-06 | `backend-tests`; medición de cohorte futura |
| HU-01/CA6 | HU-01 CA6; decisión delegada Q-03/Q-13 | T-HU01-07: cuenta mensual deduplicada; CAC con gasto/denominador; ausente = desconocido; retención 90 días | Worker analytics/PostgreSQL | Proyección analítica interna | Reporte con periodo y datos disponibles | GR-04, GR-06 | `backend-tests`; gasto y resultados reales no disponibles |
| HU-04, dependencia futura | HU-04; ADR-0002; Q-07 registrado | T-HU04-01: replay/concurrencia/fingerprint/crash y recuperación; ver escenarios del apartado de idempotencia | `payments`, `wallet-ledger`, outbox | Operación de pago futura, omitida del contrato HU-01 | Como máximo una operación durable por ámbito/clave | GR-03, GR-05, GR-09 | PostgreSQL real; harness definido para HU-04; NO EJECUTADO |

CA1 se satisface con UI; CA4–CA6 con eventos y agregados internos, no con endpoints públicos. La evidencia enumerada es esperada, no ejecutada.

## Guardrails propuestos

| ID | Fuente/motivo | Superficie | Regla verificable | Violación | Check/evidencia | Responsable | Efecto |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GR-01 | Restricción de stack | Web/backend | Angular responsive; Java 21/Spring Boot; monolito modular; dominio sin Spring/JPA/adaptadores; Python solo herramientas | Dependencia hacia dentro desde dominio o servicio distribuido sin ADR | ArchUnit y revisión de dependencias por módulo; pendiente de implementar | Arquitectura | Bloquea recomendación de construcción afectada |
| GR-02 | HU-01 CA2–CA3; identidad propia | `identity-onboarding`, PostgreSQL | Validación servidor; hashes de contraseña; UNIQUE y transacción completa; ownership desde sesión; no confiar en ownerId del cuerpo | Cuenta parcial, doble registro o acceso ajeno | Pruebas negativas y concurrencia en PostgreSQL; `backend-tests` | Backend/Security | Bloquea el alta |
| GR-03 | ADR-0002, HU-04/Q-07 | `payments`, ledger, PostgreSQL | Q-07: UUID obligatoria, ámbito pagador+clave, fingerprint canónico versionado, UNIQUE durable, replay original, conflicto 422, ventana 24 h y evidencia mientras exista pago; fuera de la ventana nunca reejecutar | Segundo cargo, replay distinto o efecto sin clave | Harness PostgreSQL real: concurrencia, replay, conflicto, crash/reintento | Ledger/Testing | Bloquea pagos hasta HU-04 verificado |
| GR-04 | HU-01 CA4–CA6; Q-02/Q-03/Q-13 delegadas | Outbox y analytics | Eventos mínimos sin PII; deduplicar por ID; abandono a 30 min; mediana solo exitosos; CAC ausente se reporta desconocido; retención lab 90 días | Conteo duplicado, métrica engañosa o exposición de PII | Pruebas de eventos/agregados/retención; `backend-tests` | Analytics/Security | Bloquea reporte afectado |
| GR-05 | ADR-0002/0003; integridad financiera | `payments`, `wallet-ledger` | PostgreSQL autoridad; dinero decimal exacto y moneda explícita; doble partida inmutable; pago+clave+outbox en una transacción; orden estable de locks; sin llamada externa | Doble gasto, asiento parcial o dinero aproximado | Invariantes y pruebas concurrentes/crash en PostgreSQL real | Ledger/Testing | Bloquea pagos |
| GR-06 | ADR-0005; privacidad | Logs, trazas, métricas, analytics | Sin PII, secretos, contraseña, cookie, token, clave idempotente o hash de fingerprint en telemetría; labels de baja cardinalidad | Identificación o secreto en observabilidad | Revisión de campos y pruebas de exposición | Security | Bloquea emisión de telemetría afectada |
| GR-07 | Política de acceso; amenaza de enumeración | Alta/login/verificación | Ownership siempre en servidor; para celular/correo, misma respuesta y tiempos comparables exista o no la cuenta; no añadir verificación/recuperación aquí. El mensaje DNI duplicado es excepción fuente y debe revisarse explícitamente. | Enumeración de cuenta o dato ajeno | Pruebas negativas de API y comparación de respuestas/tiempos; el conflicto CA3/privacidad sigue pendiente | Security/PO | Bloquea construir alta hasta resolver la tensión documentada |
| GR-08 | HU-01 CA1–CA3; contrato/UX | Angular + API | Errores y estados coherentes; aceptación HTTP no equivale a pago; Home activo no ejecuta pagos fuera de HU-02/HU-04 | Mostrar pago disponible o éxito financiero prematuro | `frontend-tests`, contratos y escenarios de doble clic/reintento futuros | Frontend/Testing | Bloquea UX afectada |
| GR-09 | Alcance y entorno OCI | Compose objetivo, backend, dependencias y runner | Sin proveedor externo/simulado, WireMock, Redis, broker, nueva base, Keycloak/OIDC, microservicios o event sourcing sin ADR. Todo servicio futuro en OCI/Compose Podman compatible; runner sin socket del motor ni acceso al plano financiero | Ampliación no aprobada o runtime/credencial en host | Revisión Compose y aislamiento; Compose no ejecutado | Platform/Security | Bloquea despliegue/elemento afectado |

**Estado de controles:** propuestas, no implementadas ni verificadas. La tensión concreta GR-07 está abierta como pregunta de producto/seguridad, no queda resuelta por las decisiones delegadas existentes.

## Cambios ADR/C4 propuestos

- **ADR-0001:** añadir `identity-onboarding` como módulo con propiedad de identidad/onboarding, puertos, casos de uso y límites de tabla; ninguna dependencia de dominio hacia Spring. Estado del ADR no cambia.
- **ADR-0002:** añadir hashes de credenciales, unicidad normalizada, transacción de activación y pruebas de concurrencia para identidad; conservar ledger/idempotencia futuros de `payments`. No cambiar el estado del ADR.
- **ADR-0004:** registrar sesión servidor/CSRF y riesgo de enumeración: resolver la tensión DNI/CA3 antes de aprobar la exposición de alta; no declarar la amenaza mitigada hasta probarla.
- **ADR-0005:** añadir eventos minimizados de onboarding y Q-02/Q-03/Q-13 delegadas como especificación solo de laboratorio; CAC desconocido cuando falta atribución de gasto.
- **ADR-0007:** declarar explícitamente que HU-01 no consulta ni indexa en Meilisearch. Mantener PostgreSQL como fuente y Meilisearch como proyección de búsqueda eventual de HU-02.
- No se propone nuevo ADR para idempotencia: seguir ADR-0002/Q-07 en HU-04. C4 de este cambio añade los nodos futuros requeridos, marcados como alcance posterior.

## Riesgos y handoff

1. **Producto/Security:** resolver igualdad observable de alta por celular/correo frente a alta inmediata, sesión/Home y mensaje explícito de DNI duplicado. No habilitar construcción del endpoint de alta hasta decisión revisada.
2. **Security:** revisar modelado de sesión, CSRF, fuerza de contraseña y datos expuestos. La propuesta no equivale a revisión de seguridad.
3. **Testing:** verificar matriz CA/escenarios, unicidad concurrente, rollback, ownership y analítica con los checks autorizados. Los escenarios idempotentes financieros pertenecen a HU-04 y requieren PostgreSQL real.
4. **AI Engineering/Platform:** el contexto registra Q-15 como riesgo aceptado para runner Copilot en host, sin filtro de egress; esto no satisface la petición arquitectónica de que el runner futuro esté en OCI. Se propone contenerizarlo, separado del backend, sin socket del motor/secretos y sujeto a revisión; no se afirma que el riesgo histórico haya sido corregido ni se modifica Q-15.
5. No afirmar Compose, browsers, Meilisearch, OpenAPI validator, renderer Mermaid, build ni pruebas ejecutadas. Los checks disponibles citados son planes; la salida real deberá registrarse por el proceso autorizado.

## Validación documental pendiente

No se ejecutaron validadores. Pendiente: parseo/validación OpenAPI 3.1 y resolución de `$ref`; renderizado de Mermaid C1/C2/C3; checks autorizados `openspec`, `backend-tests` y `frontend-tests`. Validación manual Edge/Chrome/Safari y Compose quedan NO EJECUTADOS. La generación de estos documentos no es evidencia de aceptación ni de baseline entregada.
