# Evidencia de ejecuciones

Los artefactos de cada ejecucion se guardan localmente en una subcarpeta por
run_id; estan ignorados por Git por defecto. No hay ejecuciones con modelos ni
producto real. Solo evidencia sanitizada y revisada se incorpora a OpenSpec.

El estado registra change_id, revisiones/gates, identidad declarada, modelo,
contadores de llamadas/tokens, checks firmados, escenarios, bloqueos y decisiones.
No implementa coste monetario ni autenticacion independiente del reviewer; esas
garantias dependen de la politica y custodia del operador.

No guardar secretos, prompts con datos reales ni tokens de sesion. No confundir
un resumen LLM con stdout, prueba ejecutada o aprobacion autenticada.

## Paquete propuesto por run

```text
<run_id>/
	run.json              fuentes, revision, gates, consumo y estado
	definition/           borradores por HU
	workspace/            snapshot y candidatos de producto
	check-request.json    comando/snapshot autorizado para operador
	delivery/             exportacion solo tras todos los G3
```

Contrato tipado: [contracts.py](../runner/src/wallet_agents/contracts.py).
El [manual del runner](../runner/README.md) define el writer y las revisiones.
No guardar credenciales ni
aprobaciones autoritativas en un volumen escribible por agentes. La clave
privada de firma vive en `.wallet-operator/`, fuera de montajes del runner; la
clave publica de verificacion y los recibos viven en `.wallet-control/`. La evidencia
del ejecutor se protege fuera de esas escrituras; el indice solo la referencia.
Los borradores permanecen draft hasta revision humana, sin autoarchivo OpenSpec.