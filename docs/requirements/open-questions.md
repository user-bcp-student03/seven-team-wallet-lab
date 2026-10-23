# Decisiones pendientes

Estado (2026-10-23): la tabla describe la pregunta original. Cerradas para el
laboratorio, segun el [registro de resolucion](#registro-de-resolucion):
Q-01, Q-04, Q-05, Q-07, Q-10, Q-11, Q-15, Q-16, Q-17 y Q-18. Siguen abiertas
Q-02, Q-03, Q-12, Q-13 y Q-14 (analitica, SLO, retencion y medicion; no bloquean
la definicion funcional y deben tratarse como pendientes, sin inventar umbrales).
Q-06, Q-08 y Q-09 se difieren con comercios, soporte y conciliacion operativa.
Alcance activo HU-01 -> HU-02 -> HU-04. Una decision cerrada solo vale para este
laboratorio con datos ficticios; no es una politica de produccion ni una
afirmacion regulatoria.

| ID | Decision | Responsable propuesto | Afecta |
| --- | --- | --- | --- |
| Q-01 | Pasos, datos minimos y reglas internas de validacion de identidad (sin sistema KYC externo); consentimiento y retencion de datos | Producto y seguridad | HU-01 |
| Q-02 | Eventos exactos de inicio/fin, pausas y abandonos; mediana por cohorte | Producto y analitica | HU-01 CA4-5 |
| Q-03 | Definicion de usuario activo, deduplicacion del evento de activacion, atribucion/gasto y formula CAC | Producto y analitica | HU-01 CA6, HU-02 CA6 |
| Q-04 | Limite de bajo monto por canal, frecuencia, saldo y regla de redondeo PEN | Producto y cumplimiento | HU-02 |
| Q-05 | Estados visibles, transiciones y cuando puede declararse expirado un pago interno | Producto y operaciones | HU-02, HU-03 |
| Q-06 | Formato/estandar QR del simulador, alias, expiracion del QR y verificaciones del destino | Producto y pagos | HU-02, HU-03 |
| Q-07 | Alcance y ventana de retencion de clave por canal; conflicto por payload distinto; recuperacion tras crash | Pagos y operaciones | HU-04 |
| Q-08 | Categorias de disputa, elegibilidad de reversos, SLA, escalamiento y doble control | Soporte y cumplimiento | HU-05 |
| Q-09 | Tolerancia de descalce, horarios, zona America/Lima, corte, eventos tardios y reapertura de conciliacion | Operaciones | HU-06 |
| Q-10 | Fondeo y retiro ficticios (seed o carga interna), cuentas contables, reservas y liberaciones | Producto y ledger | HU-02, HU-06 |
| Q-11 | Politica de claves, bloqueo por intentos, MFA/step-up, sesiones, recuperacion de cuenta y roles operativos con usuarios en PostgreSQL | Seguridad y producto | Todas |
| Q-12 | SLO de disponibilidad/latencia, frescura de Meilisearch y presupuestos de reintento | Operaciones | HU-02, HU-04 |
| Q-13 | Retencion/anonimizacion de auditoria y analitica; controles aplicables a datos sinteticos | Seguridad y producto | Todas |
| Q-14 | Ventana de medicion de checkout: trimestre de lanzamiento o trimestre posterior | Producto | Epica, HU-02 CA5 |
| Q-15 | Modelo/endpoint LLM, limites de gasto, datos autorizados, herramientas sandbox y mecanismo de aprobacion (cerrada para el laboratorio el 2026-10-23; ver registro de resolucion) | Responsable del laboratorio | CrewAI |
| Q-16 | Versiones e imagenes compatibles de Angular/Node, Spring Boot/Java 21, PostgreSQL, Meilisearch, OpenSpec, CrewAI y proveedor Compose de Podman | Arquitectura | Esqueletos, contenedores y agentes |
| Q-17 | Definicion de concepto (texto, categoria o ambos), campos buscables, filtros, orden, paginacion, frescura y retencion del indice | Producto y seguridad | Extension de historial HU-02 CA3 |
| Q-18 | Modelo de contactos: como se agregan, si requieren aceptacion mutua, alias, bloqueo/eliminacion y limites de pago solo a contactos | Producto y seguridad | HU-01, HU-02 |

## Decisiones tecnicas acordadas

PostgreSQL es el write model y fuente autoritativa; Meilisearch es el read model
para movimientos y conceptos. No es opcional ni se propone Redis/MongoDB como
sustituto. Todo el entorno se ejecutara con imagenes OCI y Compose compatible
con Docker/Podman Desktop, sin exigir Java/Node/Python en el host. Q-16/Q-17
resuelven versiones y semantica, no reabren estas selecciones de stack.

Decision del 2026-10-23: no hay proveedores externos ni simulados (sin WireMock);
los pagos son transferencias internas entre contactos liquidadas en el ledger de
PostgreSQL. La autenticacion usa una tabla de usuarios con claves hasheadas en
PostgreSQL y sesion de servidor, sin Keycloak/OIDC. Las HU originales mencionan
proveedores, rieles y KYC simulado; se conservan intactas y esas referencias se
interpretan como no aplicables o como reglas internas hasta que producto lo cierre
(Q-01, Q-05, Q-18).

## Salvaguardas de diseno propuestas

- Un timeout del cliente no prueba un pago fallido: reintentar con la misma clave
  de idempotencia y consultar el resultado original.
- No crear otro cobro ante un reintento: la clave devuelve el resultado ya registrado.
- Una transferencia ejecutada no se cancela unilateralmente. Un reverso requiere
  un proceso separado, autorizado y con asientos compensatorios.
- La retencion de claves debe cubrir el horizonte de reintentos y recuperacion;
  no decidirla mediante un TTL de cache.
- No introducir requisitos legales peruanos ni reglas publicadas para 2027
  como hechos verificados: las menciones del material fuente necesitan revision
  especializada antes de cualquier uso con fondos reales.

## Registro de resolucion

Cada cierre debe incluir ID, decision, autor/aprobador, fecha, contexto de
laboratorio o produccion, ADR/spec afectado y escenarios de aceptacion. Hasta
entonces los agentes deben devolver preguntas, no completar reglas por intuicion.

### Q-15 - Cerrada para el laboratorio (2026-10-23)

- Aprobador: responsable del laboratorio (usuario del repositorio), registrado a
  peticion suya en esta sesion. Contexto: caso de estudio, solo datos y dinero
  ficticios; no aplica a produccion ni a fondos reales.
- Proveedor: CrewAI con `copilot_sdk` (Copilot personal), modelo `gpt-6-luna`,
  segun `.wallet-control/policy.json` (ignorado por Git, sin secretos en el repo).
- Gasto: sin tope monetario por decision explicita. El runner no puede imponer un
  maximo monetario; solo limita llamadas, tokens de salida y tiempo. Riesgo aceptado.
- Datos autorizados: documentos sinteticos del repositorio (fuentes, reglas de
  negocio, arquitectura, specs, perfiles y skills). Excluidos: secretos, tokens,
  PII o datos financieros reales y contenido de otros proyectos.
- Aislamiento: la sesion de Copilot exige `-HostRunner` (runner en el host, sin
  filtro de egress ni aislamiento OCI); `operator` y los checks siguen en
  contenedores, sin red. Riesgo aceptado para el laboratorio.
- Aprobacion: gate G0 firmado con la clave local del operador. Autentica la
  version de los artefactos, no la identidad ante terceros.
- Alcance: autoriza la ejecucion documental (definicion) de HU-01, HU-02 y HU-04.
  No autoriza construir la wallet, pagos, despliegues ni commits; la construccion
  requiere un cambio OpenSpec aprobado y cerrar Q-16 y las preguntas funcionales.
- Afecta: [add-crewai-wallet-orchestration](../../openspec/changes/add-crewai-wallet-orchestration/proposal.md),
  ADR-0006, tarea 4.4 (S19-S21). Evidencia pendiente: una ejecucion real aun no
  realizada.

### Decisiones de producto del laboratorio (2026-10-23)

Aprobador: responsable del laboratorio (usuario del repositorio), a peticion suya
en esta sesion. Contexto: laboratorio con dinero y datos ficticios; no son politicas
de produccion ni afirmaciones regulatorias. Las cifras marcadas (propuesta) no
proceden de [BUSSINESS_RULES.md](../BUSSINESS_RULES.md): las propuso el asistente y
el responsable las acepto. Cada decision afecta a las specs/design de HU-01, HU-02
y HU-04 y debe tener escenarios de aceptacion en la definicion.

**Q-01 Onboarding (HU-01).** Datos: tipo de documento (DNI), numero de DNI de 8
digitos numericos, celular de 9 digitos numericos, correo con dominio valido y
clave. Validacion de identidad interna por formato y unicidad, sin sistema externo
ni KYC. "El cliente ya existe" si coincide el numero de documento; celular y correo
tambien deben ser unicos (propuesta). Sin consentimiento real; datos sinteticos; la
retencion queda abierta en Q-13. Mensajes: "El cliente ya existe" y "El cliente fue
creado con exito" (con Home del Wallet).

**Q-04 Limites e ITF (HU-02).** Moneda PEN; monto minimo 1 y maximo 2000; sin limite
de frecuencia. ITF de 0.05 % para montos >= 1000, redondeado a 2 decimales con
.5 hacia arriba (propuesta); lo paga el pagador ademas del monto y se exige saldo >=
monto + ITF (propuesta). Se muestra como movimiento adicional con glosa ITF. El 0.05 %
es una regla del laboratorio, no una afirmacion sobre la tarifa legal vigente.

**Q-05 Estados (HU-02).** Estados terminales EXITOSO, FALLIDO y EXPIRADO, uno por
intento. FALLIDO: validacion, fondos insuficientes o contacto invalido; no mueve
dinero. EXPIRADO: la confirmacion caduca a los 5 minutos sin confirmar (propuesta);
no mueve dinero. EXITOSO: referencia unica persistida en el historial. Sin reservas:
el pago es una sola transaccion ACID en el ledger. No hay resultado "incierto" de
proveedor; si el cliente pierde la respuesta, consulta por referencia o reintenta
con la misma clave.

**Q-07 Idempotencia (HU-04).** Clave UUID generada por el cliente para cada intento
de confirmacion; ambito = pagador autenticado + clave. Mismo payload: devuelve el
resultado y la referencia originales, sin otro cobro. Payload distinto con la misma
clave: 422, sin mover dinero. Misma clave aun en proceso: la segunda solicitud espera,
con limite de tiempo, el commit de la primera y devuelve su resultado; si excede ese
limite responde 409. Ventana de replay de
24 h (propuesta); el registro de la clave y la evidencia original/reintento
(HU-04 CA4) se conservan mientras exista el pago, y pasada la ventana una clave
reutilizada se rechaza, nunca se ejecuta otro cobro. Crash antes del commit: no hay
efectos; el reintento con la misma clave se procesa como primera vez.

**Q-10 Fondeo y cuentas.** Sin fondeo ni retiro en la aplicacion. Cada usuario
sintetico del seed parte con S/ 5,000.00 (propuesta). Sin reservas ni liberaciones.
Cuentas: una por usuario, una contrapartida de sistema para el seed y una cuenta de ITF.

**Q-11 Claves, bloqueo y sesion.** Clave alfanumerica de 8 a 20 caracteres con al
menos una letra y un numero (el minimo de 8 es propuesta). Bloqueo de 15 minutos tras
5 intentos fallidos; sesion de servidor con expiracion a los 30 minutos de inactividad;
mensaje unico "Datos incorrectos". Sin MFA, sin recuperacion de cuenta y un solo rol
(pagador). Claves solo como hash (Argon2id o equivalente aprobado).

**Q-16 Versiones (verificadas el 2026-10-23 contra los registros publicos).**
Java 21 (Temurin) con Maven 3.9; Spring Boot 4.1.2 (4.2 sigue en RC y se excluye);
Angular 21.2.x LTS (la del perfil de Security; la ultima es 22.2.3); Node 24 LTS
(24.22.1) solo en imagenes de build; PostgreSQL 18.6; Meilisearch 1.55.0; OpenSpec
1.14.3; CrewAI 1.15.28 y github-copilot-sdk 1.0.26 (runner). Proveedor Compose actual:
podman-compose. Se fijaran por digest al crear las imagenes.

*Esqueletos y checks de producto (2026-10-23).* El repositorio incluye un esqueleto
minimo en `backend/` (pom.xml Spring Boot 4.1.2 / Java 21, con las dependencias
aprobadas, y una clase `WalletApplication` con su test) y en `frontend/` (Angular
21.2.x con Vitest, `package.json` y configuracion). Los checks de producto corren
sin red y solo con esas dependencias ya descargadas en imagenes fijadas por digest
(`agents/runner/checks-backend.Dockerfile` y `checks-frontend.Dockerfile`):
- Una dependencia que no figure en `backend/pom.xml` o `frontend/package.json` no se
  puede resolver y el check falla. No hay lockfiles ni acceso a registros en los checks.
- `backend-tests` ejecuta `mvn test` con un PostgreSQL 18 efimero dentro de la imagen
  (127.0.0.1:5432; base, usuario y clave `wallet`; variables `WALLET_DB_URL`,
  `WALLET_DB_USER` y `WALLET_DB_PASSWORD`). No hay motor de contenedores: no usar
  Testcontainers ni H2; las pruebas de ledger, concurrencia e idempotencia usan esa
  base real. Meilisearch no esta disponible: las pruebas de la proyeccion usan fakes
  o stubs HTTP y la verificacion con Meilisearch real queda `NO EJECUTADO`.
- `frontend-tests` ejecuta `ng test` (Vitest con jsdom). No hay navegador, Playwright
  ni E2E; esos escenarios quedan `NO EJECUTADO`.
- Compose, observabilidad y el arranque completo no se ejecutan en los checks y
  quedan `NO EJECUTADO` hasta que un humano los levante.
- Cada salida de un agente admite como maximo 100 archivos de 500 KB, y solo en las
  rutas exactas declaradas en las tareas del plan de entrega.

**Q-17 Busqueda de movimientos.** El pago tiene un campo opcional "concepto" de texto
libre de hasta 140 caracteres (propuesta). Busqueda por texto en concepto, alias de
contacto y glosa; filtros por rango de fechas (maximo 90 dias), tipo (pago/ITF) y rango
de monto; orden por fecha descendente; paginas de 10 con scroll incremental;
consistencia eventual; retencion visible de 90 dias. El indice es una proyeccion de
PostgreSQL, sin saldos, autorizacion ni idempotencia.

**Q-18 Contactos.** Solo se paga a contactos. Un contacto se agrega por numero de
documento o celular de un usuario registrado, sin aceptacion mutua. Alias opcional;
se puede eliminar; sin bloqueo. Antes de confirmar se muestran alias, DNI enmascarado
(3 ultimos digitos visibles) y monto, porque el onboarding no recoge nombre. Sin
limites especiales por contacto.

**Siguen abiertas** Q-02, Q-03, Q-12, Q-13 y Q-14: el responsable decidio no
tratarlas ahora. Los agentes deben dejarlas como pendientes, sin inventar eventos de
medicion exactos, SLO, retencion ni formulas; MAU y CAC se reportan como desconocidos.