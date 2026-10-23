---
name: ledger-idempotency
description: "Usar para doble partida, importes exactos, claves idempotentes, concurrencia y pagos internos entre contactos HU-02/HU-04."
---

# Integridad financiera e idempotencia

## Procedimiento

1. Revisar [ADR-0002](../../../architecture/adr/0002-postgresql-ledger-idempotency.md)
   y Q-04/Q-05/Q-07/Q-10 antes de definir politicas financieras.
2. Mantener ledger equilibrado por moneda, asientos inmutables e importes
   BigDecimal/NUMERIC; nunca float/double ni saldos autoritativos en el indice.
3. Definir clave por ambito, fingerprint, unicidad SQL, transaccion y locking.
   Replay devuelve la referencia original; payload conflictivo no mueve fondos.
4. Un pago es una transferencia interna entre contactos en una sola transaccion
   ACID (debito, credito, clave y outbox). Cubrir solicitudes simultaneas, crash
   antes del commit, reintentos con la misma clave y destino que no es contacto.
   Un timeout del cliente no significa fallo; no hay proveedores ni callbacks.
5. Mantener evidencia original/reintento HU-04 CA4 sin construir HU-06 diaria.
   Bloquear habilitacion de pagos hasta verificar invariantes idempotentes.

## Salida y verificacion

Invariantes, fronteras atomicas y escenarios de concurrencia/recuperacion con
resultado financiero esperado. No afirmar pruebas PostgreSQL ejecutadas sin evidencia.