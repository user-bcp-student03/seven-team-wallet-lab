# OpenSpec

Esquema `spec-driven`. Configuracion creada manualmente siguiendo la
[documentacion oficial](https://github.com/Fission-AI/OpenSpec/blob/main/docs/customization.md).
No se ha ejecutado `openspec init` ni instalado integraciones/slash commands del editor.

## Estado

[define-wallet-mvp](changes/define-wallet-mvp/proposal.md) es el cambio activo de
definicion: documenta el proceso de refinamiento y contiene tareas para convertir
las HU activas en especificaciones verificables, en orden HU-01 -> HU-02 -> HU-04.
HU-03/HU-05/HU-06 estan diferidas, con fuentes intactas. No afirma que el producto este
especificado por completo ni autoriza su construccion.

[add-crewai-wallet-orchestration](changes/add-crewai-wallet-orchestration/proposal.md)
es el cambio separado del runner, aprobado para implementacion: fuentes,
artefactos por HU, Flow, gates G0-G3 y construccion supervisada. Incluye un
[runner ejecutable](../agents/runner/README.md) verificado offline. Q-15/Q-16
siguen abiertos para la activacion real y las versiones del producto.

[specs/](specs/README.md) se reserva para la baseline vigente. Las capacidades
propuestas viven en `changes/<change>/specs/<capability>/spec.md` como delta specs;
no sincronizar borradores como si fueran comportamiento ya entregado.

## Flujo previsto

1. Revisar fuentes activas y preguntas aplicables hasta Q-17 con producto y responsables tecnicos.
2. Completar proposal, specs, design y tasks de definicion; resolver bloqueos.
3. Revision humana y aprobacion de requisitos y arquitectura.
4. Crear cambios acotados de construccion con tareas y escenarios propios.
5. Habilitar CrewAI solo sobre un cambio aprobado y con herramientas aisladas.
6. Verificar evidencia, sincronizar specs y archivar con revision humana.

Desde la raiz, con Node/npm disponibles y la version validada en esta entrega:

```powershell
npx --yes @fission-ai/openspec@1.14.3 list --json
npx --yes @fission-ai/openspec@1.14.3 status --change define-wallet-mvp --json
npx --yes @fission-ai/openspec@1.14.3 validate define-wallet-mvp --strict
npx --yes @fission-ai/openspec@1.14.3 validate add-crewai-wallet-orchestration --strict
```

Estos comandos inspeccionan/validan documentos; no ejecutan pagos ni agentes.
Version comprobada: OpenSpec 1.14.3, 2026-10-23. No usar `latest` en CI.

Node/npm se usaron para comprobaciones documentales de preparacion; no son un
requisito del host para el futuro entorno. Al implementar, los checks y OpenSpec
se ejecutaran tambien desde imagenes OCI fijadas, compatibles con Podman Desktop.

El CLI valida forma y estructura, no la suficiencia financiera de las reglas.
La existencia de tareas no equivale a aprobacion. Los gates humanos se imponen
en el runner/CI, no mediante el esquema estandar de OpenSpec.