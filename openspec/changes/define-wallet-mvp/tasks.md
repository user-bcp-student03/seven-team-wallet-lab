## 1. Refinar las HU activas en secuencia

Orden HU-01 -> HU-02 -> HU-04, sin renumerar. La entrega de HU-02 requiere
proteccion idempotente; el orden no autoriza pagos desprotegidos.

- [ ] 1.1 HU-01 CA1-3: cerrar Q-01/Q-11/Q-18; escenarios pasos, validacion de identidad interna, login con clave hasheada y activacion; evidencia: spec y decisiones aprobadas.
- [ ] 1.2 HU-01 CA4-6: cerrar Q-02/Q-03; escenarios duracion, cohortes, MAU/CAC; evidencia: diccionario de eventos y consultas de ejemplo.
- [ ] 1.3 HU-02 CA1-4: cerrar Q-04/Q-05/Q-10/Q-18; escenarios pago a un contacto, monto, fondos, terminalidad y reintento; evidencia: invariantes y estados aprobados.
- [ ] 1.4 HU-02 CA5-6 y extension CA3: cerrar Q-03/Q-14/Q-17; escenarios checkout/activacion y busqueda de movimientos/conceptos; evidencia: metricas, filtros y semantica aprobados.
- [ ] 1.5 HU-04 CA1-3: cerrar Q-07; escenarios replay, conflicto, concurrencia y crash; evidencia: contrato idempotente durable y retencion aprobada.
- [ ] 1.6 HU-04 CA4: definir salida de control de originales/reintentos, sin construir HU-06; evidencia: fixtures y reporte esperado con referencias financieras unicas.

## 2. Completar especificacion y diseno

- [ ] 2.1 HU-01/HU-02/HU-04: completar delta specs funcionales SHALL/WHEN/THEN y mapa de cada CA; evidencia: cobertura de las tres HU sin activar las diferidas.
- [ ] 2.2 HU-02/HU-04: disenar PostgreSQL, ledger, transacciones, outbox y locking; evidencia: esquema y escenarios de fallo/concurrencia revisados.
- [ ] 2.3 Extension HU-02 CA3: disenar Meilisearch, contrato de concepto, ownership, indexacion asincrona, checkpoint y reindex; evidencia: escenarios duplicado/fuera de orden, aislamiento, retraso/caida y reconstruccion.
- [ ] 2.4 HU activas: completar OpenAPI/eventos y permisos; evidencia: contratos, consulta autoritativa por referencia y ejemplos negativos sin dependencia financiera del indice.
- [ ] 2.5 HU activas: cerrar Q-11/Q-12/Q-13 y revisar ADR/C4/amenazas/OTel; evidencia: ASVS aplicable y pruebas de privacidad del indice/telemetria.
- [ ] 2.6 HU activas: cerrar Q-16 y disenar imagenes OCI y Compose para todo el entorno, incluido CrewAI; evidencia: versiones fijadas y plan de config/build/healthchecks sobre Podman Desktop, sin crear esqueletos en este cambio.

## 3. Preparar la construccion supervisada

El diseno detallado del runner se mantiene en el cambio separado
[add-crewai-wallet-orchestration](../add-crewai-wallet-orchestration/proposal.md).
Sus cascarones no completan estas tareas ni habilitan la construccion.

- [ ] 3.1 HU-01 -> HU-02 -> HU-04: crear cambios pequenos con dependencias, escenarios y checks en contenedores; evidencia: backlog OpenSpec ordenado y gate de idempotencia antes de habilitar pagos.
- [ ] 3.2 Workflow: completar/revisar perfiles de PO, AI Engineering, Testing, Arquitecto y Security; cerrar Q-15 y disenar runner/Flow en contenedor, contexto seguro, presupuestos y gates; evidencia: rechazo de perfil draft, ausencia de aprobacion, artefacto modificado y herramienta no permitida sin montar socket del motor.
- [ ] 3.3 Workflow: revisar specs/diseno/ADRs con producto y responsables tecnicos; evidencia: aprobacion humana versionada y bloqueos por cambio.
- [ ] 3.4 Workflow: verificar este cambio documental y sincronizar solo specs aprobadas; evidencia: validacion estricta, enlaces y originales intactos. No ejecutar agentes de construccion.