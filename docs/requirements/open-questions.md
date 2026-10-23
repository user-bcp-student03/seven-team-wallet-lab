# Decisiones pendientes

Estado: preguntas abiertas salvo las decisiones tecnicas expresamente acordadas.
Alcance activo HU-01 -> HU-02 -> HU-04; Q-06/Q-08/Q-09 se difieren con
comercios, soporte y conciliacion operativa. Ningun valor de esta tabla es una politica
aprobada. Resolver solo las decisiones que afecten al cambio antes de construirlo;
no es necesario bloquear trabajo documental independiente.

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
| Q-15 | Modelo/endpoint LLM, limites de gasto, datos autorizados, herramientas sandbox y mecanismo de aprobacion | Responsable del laboratorio | CrewAI |
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