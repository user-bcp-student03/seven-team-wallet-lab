# Propuesta: orquestacion CrewAI de la iniciativa wallet

Estado: el usuario aprobo implementar el runner CrewAI y usar los perfiles
existentes `agents/specialists/` (2026-10-23). No equivale a una aprobacion
operativa G0 ni autoriza llamadas LLM, resolver politicas de producto, pagos,
despliegues, commits o push. La implementacion y sus bloqueos se registran en
[el manual](../../../agents/runner/README.md).

## Why

Los roles, perfiles, skills y tareas YAML existentes no instancian agentes ni
conectan entradas/salidas. Se necesita un contrato explicito para transformar
requisitos en artefactos y, en una ejecucion posterior autorizada, construir el
producto sin delegar al LLM permisos, aprobaciones o evidencia de pruebas.

## What Changes

- Definir entrada versionada de epica y HU-01 -> HU-02 -> HU-04, sin modificar
  los siete originales ni activar HU-03/HU-05/HU-06.
- Separar un Flow Python de control de los crews de definicion y construccion;
  reutilizar agentes, skills, perfiles y tareas existentes sin duplicar backlog.
- Especificar contratos de artefactos, procedencia, evidencia, revisiones,
  correcciones acotadas y aprobacion humana fuera de las decisiones del LLM.
- Implementar runner Python/CrewAI nativo, CLI, persistencia de gates G0-G3,
  perfiles reales, aprobaciones firmadas y checks en contenedores externos.
- Disenar el aislamiento OCI/Compose Docker/Podman, con lifecycle externo a los
  agentes, permisos minimos y ninguna conexion al plano financiero del producto.

## Capabilities

### New Capabilities

- `crewai-orchestration`: ingreso seguro de fuentes, generacion de artefactos por
  rol, gates versionados y construccion/revision supervisada.

### Modified Capabilities

Ninguna baseline implementada. Se complementa el cambio de definicion existente;
no se sincronizan ni archivan sus delta specs ni se aprueban politicas abiertas.

## Impact

- Superficies: agents/runner/, configuraciones documentales, flujo e indices.
- Trazabilidad funcional: HU-01 CA1-6, HU-02 CA1-6 y HU-04 CA1-4, en ese orden.
  La orquestacion es una necesidad tecnica derivada, no texto original de las HU.
- Bloqueos de activacion: Q-15 para proveedor, coste monetario, datos, egress e
  identidad de aprobador; Q-16 para imagenes de checks/producto; revision humana
  G0 y resolucion de preguntas funcionales aplicables. La version del runner
  esta fijada; esto no cierra las versiones de producto.
- Construccion del producto: requiere ademas un cambio acotado aprobado y cerrar
  las preguntas funcionales que afecten a sus tareas. No autorizar pagos sin
  verificar los invariantes idempotentes de HU-04.
- Verificado offline: imagen, Compose, CLI G0 y nueve pruebas en runtime CrewAI.
  No se han hecho llamadas a modelos reales ni construido aplicaciones.
- Fuera de alcance: aplicaciones wallet, proveedores reales, nuevas bases,
  commits y despliegues.

Fuentes: [requisitos](../../../docs/requirements/README.md),
[preguntas](../../../docs/requirements/open-questions.md),
[arquitectura](../../../architecture/README.md),
[configuraciones](../../../agents/README.md) y
[definicion inicial](../define-wallet-mvp/proposal.md).