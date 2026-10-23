# Observabilidad y medicion

Arquitectura objetivo, sin instrumentacion desplegada. Ver
[ADR-0005](adr/0005-observability-analytics.md).

## Senales tecnicas

OTLP -> Collector -> Tempo (trazas), Prometheus (metricas), Loki (logs) y Grafana.
Propagar W3C Trace Context entre API, adaptadores y workers; conservar correlacion
en outbox sin convertir un identificador externo no validado en autoridad.

| Vista | Senales propuestas | HU |
| --- | --- | --- |
| Pagos | Latencia p50/p95/p99, errores por codigo, pagos rechazados y reintentos con la misma clave | HU-02 |
| Workers | Reintentos, backlog/edad del outbox | HU-02, HU-04 |
| Ledger/idempotencia | Operaciones rechazadas, reservas, invariantes, originales y reintentos | HU-02, HU-04 |
| Busqueda | Lag de proyeccion, tareas Meilisearch fallidas, latencia, edad/backlog y progreso de reindex | Extension HU-02 CA3 |
| Seguridad | Accesos denegados, filtros de busqueda rechazados, logins fallidos y bloqueos | HU activas |

Labels de baja cardinalidad: canal, tipo de operacion, codigo y estado acotados.
No labels con usuario, transaccion, alias o clave. Umbrales, SLO, retencion y
muestreo se aprobaran en Q-12/Q-13. Toda alerta debe tener responsable y runbook.

## Eventos de negocio propuestos

`onboarding.started`, `onboarding.step_completed`, `onboarding.completed`,
`checkout.started`, `payment.succeeded`, `payer.activated` y
`acquisition.cost_attributed`. Son nombres propuestos, no un contrato aprobado.

Campos minimos a evaluar: event_id, schema_version, occurred_at UTC, sujeto
seudonimizado, cohorte/canal y referencia de causalidad. La tabla analitica debe
deduplicar event_id y aplicar la definicion aprobada de activacion; no usar
trace_id como unica identidad del evento de negocio.

La mediana de onboarding usa fronteras Q-02. La caida de checkout depende de
denominador, ventana y tratamiento de abandono. MAU requiere usuario unico por
mes, no conteo de pagos. CAC requiere gasto atribuible y nuevos usuarios segun
Q-03; representar ausencia de datos como desconocido, no como cero.

## Evidencia futura

Probar extremo a extremo la correlacion, redaccion, entrega/deduplicacion de
eventos y consultas de cohortes con fixtures sinteticos. La auditoria financiera
no se muestrea ni se sustituye por logs. Los objetivos de negocio solo podran
validarse realmente con una cohorte real autorizada, fuera de este laboratorio.