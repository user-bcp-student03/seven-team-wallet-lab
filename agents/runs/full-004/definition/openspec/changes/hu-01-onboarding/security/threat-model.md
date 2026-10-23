# Modelo de amenazas de seguridad — HU-01 onboarding

## Resumen y dictamen

Revisión documental limitada a HU-01, identidad propia y datos ficticios. La arquitectura, el diseño y el contrato API citados son propuestas; el contexto indica que la wallet no está construida. No se revisaron código ejecutable, SQL de ownership, configuración efectiva de seguridad, imágenes Compose ni registros de pruebas. Por tanto, no se atribuyen controles implementados ni resultados verificados.

**Dictamen:** `changes_required` para el diseño del endpoint de registro: sus respuestas propuestas permiten enumerar celulares/correos. No equivale a una aprobación de implementación; no hay implementación que aprobar. Los demás puntos no verificables se registran como pendientes de evidencia, no como vulnerabilidades confirmadas. No se declara cumplimiento ASVS, certificación ni conformidad regulatoria.

## Políticas y requisitos del proyecto

- HU-01 cubre alta y activación; los pagos dependen de HU-02/HU-04 y no deben habilitarse por el mero estado activo. Fuentes: HU-01, CA1–CA6; `docs/requirements/README.md`; `architecture/README.md`.
- La identidad es propia: usuarios en PostgreSQL con claves hasheadas y sesiones de servidor; sin IdP externo ni tokens persistidos en el navegador. La decisión registrada Q-11 define Argon2id o equivalente aprobado, clave alfanumérica de 8–20 caracteres, bloqueo tras 5 fallos por 15 minutos, sesión con 30 minutos de inactividad, un rol pagador, sin MFA ni recuperación. Fuente: `docs/requirements/open-questions.md`, registro Q-11.
- PostgreSQL es autoridad. Meilisearch es una proyección eventual para búsquedas futuras, no autoridad de acceso. El navegador no accede a PostgreSQL ni Meilisearch. El servidor debe derivar identidad/ownership de la sesión y filtrar objetos en servidor. Fuentes: `architecture/README.md`; `architecture/adr/0007-cqrs-postgresql-meilisearch.md`.
- Los secretos deben quedar fuera de Git y la telemetría no debe incluir PII ni tokens. El runner no debe acceder al plano financiero ni al socket del motor. Fuente: instrucciones del repositorio y `architecture/adr/0006-spec-driven-agent-orchestration.md`.
- Las vistas C4 y ADR describen arquitectura objetivo, no despliegues existentes. Fuente: `architecture/README.md`.

**Referencias:** OWASP ASVS se usa como catálogo complementario por áreas (autenticación, sesión, control de acceso, validación, registro y configuración segura); no se asignan versión ni IDs de control porque no constan en la línea base disponible. Se complementa con OWASP API Security Top 10 2023 —API1:2023 Broken Object Level Authorization, API2:2023 Broken Authentication, API4:2023 Unrestricted Resource Consumption y API8:2023 Security Misconfiguration— y CWE-639, CWE-352, CWE-521, CWE-307 y CWE-532. Son referencias de análisis, no declaraciones de conformidad.

## Alcance, actores, activos y fronteras

**En alcance:** HU-01, registro, login, activación, sesión/CSRF, acceso a identidad propia, eventos de onboarding, privacidad, límites de secretos y aislamiento del runner descrito en el contexto. No se evalúan pagos, fondos reales, producción, otras HU, proveedores, certificaciones ni preguntas Q-11 ya resueltas para el laboratorio.

**Actores y activos:** usuario que se registra; usuario autenticado; API/BFF; PostgreSQL con credenciales hasheadas, identidad, estado de onboarding y sesión; eventos analíticos; operadores y runner de agentes. Activos sensibles: contraseña antes del hash, hash de contraseña, cookie/sesión, DNI, celular, correo, eventos vinculables e información de infraestructura.

**Fronteras:** navegador → API; API → PostgreSQL; worker → proyección de búsqueda futura; runner/agentes → archivos y recursos del host o contenedores. El navegador no debe conectarse a PostgreSQL o Meilisearch. HU-01 no requiere Meilisearch.

## Estado de evidencia

| Control/superficie | Estado según evidencia disponible |
| --- | --- |
| Aplicación Angular/API, SQL de ownership, filtros de búsqueda, configuración de contraseñas y sesiones | No verificable: el repositorio descrito contiene esqueletos, no el flujo de producto implementado. No se aportó SQL ni código de autorización. |
| Hash de contraseña, sesión de servidor, atributos de cookie y CSRF | Propuestos en `design.md` y `api/openapi.yaml`; no verificados en runtime. |
| Unicidad SQL y rollback de registro | Requisito/propuesta; no se aportaron migraciones ni resultado de `backend-tests`. |
| Respuestas del registro | Contrato propuesto en `api/openapi.yaml`; evidencia suficiente para confirmar la filtración de existencia descrita abajo en el diseño. No demuestra una explotación de un servicio desplegado. |
| Meilisearch | Fuera del flujo HU-01; la arquitectura lo reserva para la proyección futura HU-02. Índice, documentos y filtros reales no disponibles para inspección. |
| Compose, redes, volúmenes y socket del motor | Objetivo propuesto, no configuración ejecutada disponible. El runner Copilot del laboratorio se describe ejecutándose en host por Q-15; no se acredita denegación efectiva de sockets o aislamiento. |
| Logs, trazas, métricas, auditoría y retención | Reglas propuestas, no verificadas. Los eventos de producto no prueban por sí solos una auditoría de seguridad. |
| Pruebas | Los escenarios y checks citados son planes. No hay evidencia de ejecuciones confiables en el contexto. `backend-tests` usa PostgreSQL efímero cuando se ejecuta; `frontend-tests` usa Vitest/jsdom. Navegadores reales y Compose quedan NO EJECUTADOS. |

## Hallazgos

### H-01 — Enumeración de celular/correo en el contrato de registro

**Severidad: Media (defecto confirmado en el diseño propuesto; no vulnerabilidad demostrada en runtime).**  
**Capa:** API.

**Evidencia:** `api/openapi.yaml`, `POST /api/v1/onboarding/registrations`: una alta nueva responde `201` y crea sesión; una colisión de celular/correo responde `422`. Aunque el `422` usa un mensaje genérico, el código HTTP distingue ambos resultados. `design.md`, sección “Decisiones y supuestos”, reconoce que éxito y colisión son observables distintos y deja la tensión pendiente. La fuente de HU-01/Q-01 exige unicidad de celular/correo y éxito de alta; el feedback de Security exige respuestas y tiempos comparables exista o no el dato.

**Impacto:** un cliente puede probar números de celular/correos y determinar cuáles están asociados a cuentas, facilitando enumeración y ataques dirigidos. El caso es de laboratorio y no hay endpoint desplegado demostrado.

**Recomendación:** antes de construir, definir y revisar con Security/Producto un flujo que no revele existencia de celular/correo mediante status, cuerpo, cabeceras, navegación, establecimiento de sesión o diferencias temporales observables. Mantener el mensaje específico de DNI duplicado solo como excepción de producto explícitamente revisada; no asumir que anonimizar el texto resuelve la filtración. Añadir límites de frecuencia y pruebas de respuestas/timing. No afirmar mitigación hasta tener evidencia del servidor.

**Prueba propuesta, no ejecutada:** `T-HU01-03` asociado a tarea OpenSpec `1.1`, `backend-tests` con PostgreSQL efímero: registrar con celular/correo ya existentes y no existentes; comparar status, cuerpo, cabeceras, cookies y forma observable, además de distribuciones de tiempo; probar concurrencia y que los errores no revelen el campo en conflicto. La regla de tiempos comparables requiere prueba estadística y no queda demostrada por una aserción de igualdad de cuerpos.

**Referencias:** OWASP ASVS, áreas de autenticación/validación y protección de datos; API2:2023; CWE-204 (Observable Response Discrepancy), CWE-209 (Generation of Error Message Containing Sensitive Information). La selección de CWE describe el patrón, no afirma explotación.

### H-02 — Política de contraseña débil como diseño de laboratorio

**Severidad: Media (riesgo de política propuesta; la resistencia del hash no verificable).**  
**Capa:** API.

**Evidencia:** `docs/requirements/open-questions.md`, decisión Q-11: longitud 8–20 y solo caracteres alfanuméricos, sin MFA. `design.md` y `api/openapi.yaml`, esquema `RegistrationRequest`, reflejan longitud y patrón. La especificación propone Argon2id o equivalente, pero no aporta configuración, parámetros, algoritmo efectivo ni verificación de hashes existentes.

**Impacto:** el conjunto limitado de caracteres y el mínimo de 8 reducen la resistencia frente a adivinación; el bloqueo descrito no demuestra limitación efectiva ni resistencia a intentos distribuidos. Para el laboratorio no hay cuenta real expuesta.

**Recomendación:** revisión humana explícita de la política antes de cualquier uso con datos reales; definir almacenamiento mediante algoritmo de hash de contraseña aprobado y parámetros vigentes, comparación segura, actualización de hashes y protección de intentos distribuida. Conservar la decisión de laboratorio sin convertirla en política de producción ni cambiarla por inferencia. No guardar, registrar ni devolver contraseñas o hashes.

**Prueba propuesta, no ejecutada:** `T-HU01-02/03`, tarea `1.1`, `backend-tests`: inspección de hash persistido y autenticación, rechazo de contraseñas inválidas, bloqueo y liberación según Q-11, límites/rate limiting y ausencia de secretos en respuestas/logs. Revisión de configuración efectiva; no basta con que el diseño mencione Argon2id.

**Referencias:** OWASP ASVS, áreas de autenticación y almacenamiento de credenciales; API2:2023; CWE-521 y CWE-307.

### H-03 — Aislamiento del runner de laboratorio no demostrado

**Severidad: Alta para el entorno del agente; riesgo aceptado del laboratorio, fuera del producto wallet.**  
**Capa:** Contenedor.

**Evidencia:** `docs/requirements/open-questions.md`, resolución Q-15: la sesión Copilot requiere `-HostRunner`; el runner se ejecuta en el host, sin filtro de egress ni aislamiento OCI, y el riesgo se registra como aceptado. `architecture/c4.md`, C2, presenta el runner OCI aislado y sin socket como objetivo propuesto y reconoce que el runner actual no acredita ese estado. No se aportaron Compose, montajes, permisos o evidencia de que agentes no puedan acceder a sockets del motor.

**Impacto:** un agente o contenido no confiable procesado por él podría alcanzar archivos, credenciales o recursos del host si están disponibles; el acceso de red no está filtrado según la decisión registrada. No se atribuye acceso efectivo a secretos o socket sin evidencia.

**Recomendación:** mantener explícito que es riesgo aceptado de laboratorio, no control de seguridad del producto. Antes de declarar aislamiento, ejecutar el runner en contenedor separado con herramientas y montajes mínimos, sin socket Docker/Podman, privilegios, secretos ni volúmenes de wallet; limitar egress y usar entradas de solo lectura con allowlist. Inspeccionar configuración efectiva y probar denegación de acceso a socket, red y archivos no permitidos. No modificar ni reinterpretar Q-15 como riesgo ya mitigado.

**Prueba propuesta, no ejecutada:** tarea `1.4`, check `openspec` para coherencia documental y validación humana de Compose/configuración; verificar que no se monta socket, que los volúmenes son mínimos y que el runner no alcanza servicios/secretos financieros. Compose no figura como check ejecutado disponible.

**Referencia:** OWASP ASVS, áreas de configuración segura y protección de datos; API8:2023 como referencia complementaria de configuración. No es una vulnerabilidad del flujo de registro.

## Pendientes de verificación y controles por superficie

### Ownership y acceso a objetos

**No verificable, no hallazgo confirmado.** La especificación propone que la identidad se derive de la sesión y no de `ownerId/userId` del cliente (`design.md`, GR-02; `api/openapi.yaml`, registro/login). Sin embargo, no se proporcionó “ownership actual SQL”, consulta, repositorio ni endpoint implementado. No puede afirmarse que el filtro SQL exista, sea efectivo o haya pasado pruebas.

Para el alcance HU-01, el escenario planeado `T-HU01-03` debe probar con dos sesiones que A no puede consultar ni modificar identidad de B y que los identificadores de propietario no se aceptan como autoridad. Para futuras búsquedas HU-02, construir el filtro en servidor desde la identidad autenticada, no permitir que el cliente lo sustituya mediante parámetros/cuerpo/ordenación y comprobar aislamiento en cada consulta al índice y fallback SQL. Meilisearch no interviene en HU-01.

**Pruebas:** `backend-tests`, tarea `1.1`, PostgreSQL efímero para acceso cruzado y manipulación de identificadores; las pruebas de índice pertenecen a HU-02 y requieren su implementación. Sin SQL actual ni salida confiable, estado NO VERIFICABLE.  
**Referencias:** ASVS, área de control de acceso; API1:2023; CWE-639.

### Sesión, CSRF y login

**Propuesto, no verificado.** `design.md` describe sesión de servidor en cookie `HttpOnly`, `Secure`, `SameSite` apropiado y token CSRF en cabecera; `api/openapi.yaml` propone `GET /api/v1/csrf` y exige `X-CSRF-TOKEN` en registro/login. No hay `SecurityFilterChain`, configuración de cookie, rotación/invalidez de sesión, origen permitido ni prueba runtime disponible. El atributo `SameSite` queda sin valor exacto y el contrato solo dice que lo configura el adaptador.

Antes de considerar control efectivo, verificar emisión/rotación tras autenticación, expiración por inactividad, invalidación al cerrar sesión, atributos efectivos de cookie, validación CSRF en todas las operaciones mutables y protección frente a orígenes no autorizados. No recomendar desactivar CSRF en un modelo basado en cookies. Las rutas de alta/login pueden crear sesión y deben protegerse de CSRF conforme al diseño aprobado.

**Pruebas:** `backend-tests`, tarea `1.1`, pruebas de cookie, expiración, invalidación y token CSRF; `frontend-tests`, tarea `1.2`, solo UX del flujo. Ambos checks están planificados, no ejecutados.  
**Referencias:** ASVS, áreas de autenticación y gestión de sesión; API2:2023; CWE-352.

### Roles y acceso privilegiado

Q-11 define un único rol de pagador en el laboratorio; HU-01 no especifica funciones administrativas. No hay endpoints ni autorización ejecutable para verificar. No se debe inferir un rol privilegiado ni habilitarlo por el estado `ACTIVE`. Si se añaden operaciones administrativas fuera de HU-01, requerirán alcance y autorización separados, mínimo privilegio y pruebas negativas de usuario normal. La UI/guards no son autorización.

**Prueba propuesta:** `T-HU01-04`, `backend-tests`, comprobar que activación no otorga permisos de pago ni privilegios no definidos; HU-02/HU-04 cubren autorización de pagos posteriormente. No ejecutada.

### Secretos, datos y telemetría

**Propuesto, no verificado.** Las restricciones del proyecto dicen secretos fuera de Git y ausencia de PII/tokens en telemetría; `design.md` propone no registrar DNI, celular, correo, contraseña, cookie o tokens. No se aportaron logs, configuración, escaneo de secretos, atributos OTel ni resultados de pruebas. No se afirma que los repositorios o despliegues estén libres de secretos.

Los eventos `onboarding_started.v1`, `onboarding_step_completed.v1` y `onboarding_closed.v1` propuestos en `design.md` contienen `eventId`, `flowId` seudónimo, tiempo, código de paso y resultado, no valores de campos. `flowId` sigue siendo vinculable y debe limitarse a la finalidad analítica; los eventos analíticos no equivalen a auditoría de seguridad. Q-13 delega 90 días para eventos analíticos sintéticos/agregados; no resuelve retención de identidad o auditoría real.

**Recomendación/pruebas:** inspeccionar logs frontend/backend, trazas, métricas, errores y atributos; probar que no aparecen contraseñas, hashes, cookies, tokens, DNI, celular, correo ni claves en claro; limitar cardinalidad y acceso; documentar auditoría de eventos de seguridad separada y su retención. Usar revisión de artefactos/configuración y `backend-tests`; ejecución no aportada.  
**Referencias:** ASVS, áreas de registro y protección de datos; CWE-532.

### Meilisearch, redes y volúmenes

HU-01 no requiere Meilisearch. La arquitectura lo define como proyección futura de movimientos/conceptos, con ownership impuesto por el BFF y sin acceso desde navegador. No se aportaron documentos indexados, configuración, políticas de red ni Compose, así que la ausencia efectiva de PII en el índice y el aislamiento no son verificables. No se debe introducir DNI, celular, correo, contraseña/hash, cookies, tokens o identificadores sensibles en documentos o atributos de búsqueda. El filtro de ownership debe derivarse en servidor de la sesión y no de un filtro manipulable por cliente.

La separación de redes/volúmenes y el no acceso del navegador son objetivos documentados, no controles runtime comprobados. Para HU-02, revisar allowlists de campos indexados, tarea de indexación, consultas filtradas por ownership, credenciales, puertos expuestos, redes y permisos de volúmenes; probar acceso cruzado y acceso directo desde navegador. Lag, caída y reindexación pertenecen a cobertura HU-02, no son dependencias de HU-01.

**Pruebas:** tarea `1.4`, `openspec` para alcance/no dependencia de HU-01; inspección humana futura de Compose/índice. NO EJECUTADO/no verificable con evidencia actual.

## Matriz de controles y evidencia esperada

| Área ASVS (sin versión/ID de control) | Amenaza/control | Prueba relacionada | Estado |
| --- | --- | --- | --- |
| Autenticación y almacenamiento de credenciales | Hash adecuado, política de clave, login uniforme y limitación de intentos | `T-HU01-02/03`, `backend-tests`, tarea `1.1` | Diseño Q-11; no implementado/verificado según evidencia disponible |
| Gestión de sesión y CSRF | Cookie segura, sesión servidor, expiración/invalidez, token CSRF en mutaciones | `backend-tests`, tarea `1.1` | Propuesto; configuración y pruebas no aportadas |
| Control de acceso | Identidad desde sesión; prohibir acceso cruzado A/B | `T-HU01-03`, `backend-tests`, tarea `1.1` | SQL actual ausente; no verificable |
| Validación y protección de datos | Respuesta de registro no enumera celular/correo; no exponer datos en errores | `T-HU01-03`, `backend-tests`, tarea `1.1` | Contrato propuesto contradice la igualdad observable; hallazgo H-01 |
| Registro y privacidad | Telemetría mínima; eventos analíticos separados de auditoría | revisión de logs/atributos y `backend-tests`, tarea `1.3` | Propuesto; no verificado |
| Configuración segura | Aislamiento runner, redes/volúmenes mínimos y sin socket | revisión Compose, tarea `1.4` | Riesgo de host registrado; denegación de socket no demostrada |
| Proyección de búsqueda | Campos allowlist y ownership server-side no manipulable | pruebas de aislamiento de HU-02 | Fuera de HU-01; índice/configuración no disponibles |

Las tareas citadas son las del plan documental anterior; no son evidencia de ejecución. `frontend-tests` con Vitest/jsdom puede comprobar validación y navegación, pero no acredita autorización del servidor, atributos de cookie, CSRF runtime, aislamiento de red o compatibilidad manual de navegadores. `openspec` verifica documentos, no controles ejecutables.

## Bloqueos y recomendación para revisión humana

1. **Bloqueo de diseño antes de construir el registro:** resolver H-01; el contrato actual diferencia `201` de `422` para existencia de celular/correo y permite enumeración. Revisar también la excepción de DNI duplicado y su compatibilidad con el requisito de privacidad. No declarar mitigación basándose solo en mensaje genérico.
2. **Sin aprobación de implementación:** no hay flujo de producto ni evidencia ejecutada. La revisión humana deberá inspeccionar SQL/controladores/configuración y resultados de pruebas antes de aceptar controles de ownership, hash, sesión/CSRF, telemetría, índice o aislamiento.
3. Mantener el riesgo Q-15 como riesgo aceptado del laboratorio, separado de la seguridad del producto; no presentar el runner host como aislado ni afirmar denegación de socket sin evidencia.
4. Mantener el punto de pago no ejecutable desde HU-01. La activación no sustituye HU-02/HU-04 ni sus controles de autorización e integridad.

Esta revisión es defensiva y documental; no concede aprobación arquitectónica, de producto, de despliegue o normativa.