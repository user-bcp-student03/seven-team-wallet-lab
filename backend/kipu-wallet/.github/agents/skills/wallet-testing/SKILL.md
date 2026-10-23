---
name: wallet-testing
description: "Usar para revisar cobertura HU/CA, pruebas de concurrencia/idempotencia, aislamiento Meilisearch, recuperacion y evidencia real de la wallet."
---

# Verificacion de wallet

## Procedimiento

1. Mapear HU-01 -> HU-02 -> HU-04, CA y escenarios a las tareas autorizadas del
   [cambio OpenSpec](../../../openspec/changes/define-wallet-mvp/tasks.md).
2. Cubrir onboarding invalido/valido, destino/monto, resultado incierto y replay,
   conflicto de payload, concurrencia, crash y callbacks fuera de orden.
3. Cubrir busqueda por concepto, dos propietarios, filtros manipulados, lag,
   caida y reindex concurrente; comprobar que no cambia el ledger/idempotencia.
4. Planificar o ejecutar checks solo en el entorno autorizado, con comandos y
   exit codes reales. No existe aun producto ni Compose para probar en esta fase.
5. Revisar evidencia de forma independiente; no autoaprobar codigo, archivar
   cambios ni marcar tareas completas porque un agente produjo texto.

## Salida y verificacion

Hallazgos por severidad y HU/CA/escenario, evidencia comprobada y verificaciones
faltantes. Escalar bloqueos al humano sin simular aprobaciones o resultados.