# ADR-0003: Pagos internos entre contactos y outbox

- Fecha: 2026-10-23
- Estado: Propuesto; reemplaza la propuesta inicial de eventos de proveedor.
- Referencias activas: HU-02, HU-04; Q-05, Q-07, Q-18. HU-03/HU-05/HU-06 diferidas.

## Contexto

El laboratorio no integra proveedores de pago ni de KYC, reales o simulados, y no
usa WireMock. Un pago es una transferencia entre dos contactos de la wallet
liquidada en el ledger propio. Desaparecen los callbacks, la incertidumbre de
un riel externo, el reenvio a otro proveedor y la conciliacion contra terceros.

## Decision

El command de pago es una unica transaccion ACID en PostgreSQL: valida que el
destino sea un contacto del pagador, aplica limites y saldo, registra la clave de
idempotencia, debita y acredita en el ledger y escribe el evento en el outbox.
Todo se confirma junto o no se confirma nada; un crash antes del commit no deja
efectos parciales. No hay llamadas externas dentro de la transaccion.

El outbox alimenta workers del mismo monolito: proyeccion a Meilisearch
([ADR-0007](0007-cqrs-postgresql-meilisearch.md)) y eventos de analitica
([ADR-0005](0005-observability-analytics.md)). La entrega es al menos una vez y
los consumidores son idempotentes por ID de evento; no se promete exactly-once.
El pago nunca depende de que un worker haya procesado el evento.

Un timeout o corte entre navegador y API no prueba fracaso: el cliente reintenta
con la misma clave de idempotencia y recibe el resultado original o lo consulta por
referencia ([ADR-0002](0002-postgresql-ledger-idempotency.md)). Los estados
visibles y su transicion se definen en Q-05; sin proveedor no existe un estado
"incierto" por un tercero, y no se debe inventar uno sin necesidad. Un reverso, si
se habilita mas adelante, es otra operacion con asientos compensatorios.

La conciliacion con proveedores (HU-06) y los reversos/disputas (HU-05) quedan
diferidos. En este incremento se conserva la evidencia de originales y reintentos
(HU-04 CA4) y la verificacion del ledger: asientos equilibrados por moneda y
saldos coherentes con los movimientos.

## Alternativas

Un simulador de proveedor con callbacks agregaba inbox, firmas y estados inciertos
sin aportar valor a un pago interno. Kafka u otro broker agregan operacion sin
quitar la necesidad de idempotencia.

## Consecuencias y verificacion

Se simplifican el modelo de fallos y el entorno (sin simulador). Probar con
PostgreSQL real: pagos concurrentes sobre el mismo saldo, mismo reintento con la
misma clave, crash antes y despues del commit, destino que no es contacto,
fondos insuficientes, equilibrio del ledger y recuperacion del outbox tras caida de
un worker. Las condiciones multirriel de la epica no aplican a este alcance.
