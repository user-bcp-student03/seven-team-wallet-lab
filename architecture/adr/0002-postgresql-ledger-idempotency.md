# ADR-0002: PostgreSQL, ledger e idempotencia durable

- Fecha: 2026-10-23
- Estado: Propuesto.
- Referencias activas: HU-02, HU-04; Q-04, Q-07, Q-10.

## Contexto

Los reintentos, concurrencia y recuperacion tras fallos no deben duplicar
movimientos. HU-04 CA4 requiere distinguir originales y duplicados en evidencia
de control; la funcionalidad diaria completa de HU-06 queda diferida.

## Decision

PostgreSQL como unica fuente de verdad financiera. Ledger de doble partida,
asientos append-only, suma de debitos/creditos equilibrada por moneda y
referencias unicas de operacion. Correcciones mediante compensacion trazable,
nunca edicion o borrado de asientos ya contabilizados.

Importes con BigDecimal y NUMERIC de precision/escala definidas, moneda explicita
y validacion del redondeo; nunca float/double. Modelar cuentas de usuario y
reservas, si se necesitan, despues de resolver Q-10 (fondeo ficticio).

Idempotencia persistente por ambito de pagador/canal y clave, con fingerprint
canonico de monto, moneda y destino. Restriccion UNIQUE y transaccion/locking
impiden carreras; replay devuelve referencia y resultado ya registrados, incluido
estado pendiente. Payload distinto con misma clave se rechaza sin mover fondos.
La ventana de intento permite pagos legitimos posteriores con nueva clave; no
deduplicar para siempre solo por igualdad de pagador/monto/destino.

Estado, asientos del ledger y outbox se confirman atomicamente junto con la clave
en una unica transaccion local; no hay llamada externa que pueda dejar el pago a
medias. Un crash antes del commit no deja efectos y el cliente reintenta con la
misma clave. Retencion durable
segun Q-07; un TTL no borra la evidencia necesaria para prevenir duplicados.

Consultas autoritativas y analitica usan SQL; busqueda de movimientos/conceptos
usa Meilisearch como proyeccion eventual segun
[ADR-0007](0007-cqrs-postgresql-meilisearch.md). El indice nunca autoriza saldos,
confirma estados de pago ni evita por si solo dobles cargos. Su perdida no pierde
asientos ni claves; la reconstruccion parte de PostgreSQL.

## Alternativas

Redis como unico registro idempotente pierde garantias por eviction/reinicio.
MongoDB separado para lecturas agrega sincronizacion innecesaria al volumen MVP.
Event sourcing completo complica recuperacion y no es una exigencia del ledger.

## Consecuencias y verificacion

Probar con PostgreSQL real en Testcontainers: solicitudes simultaneas, replay,
conflicto de fingerprint, crash/restart, fondos insuficientes concurrentes,
balance por moneda y unicidad del asiento. La estrategia de locking y esquema
final deben quedar en el diseno OpenSpec antes de implementar.