# Diseno del proceso de definicion

## Context

Repositorio inicialmente vacio, epica y seis HU importadas intactas. Stack base
acordado; incremento activo HU-01 -> HU-02 -> HU-04. HU-03/HU-05/HU-06 diferidas.
PostgreSQL + Meilisearch y ejecucion OCI/Compose en Podman Desktop son requisitos
tecnicos acordados; las reglas pendientes no se inventan. Este cambio es documental.

## Goals / Non-Goals

Objetivo: producir especificaciones comprobables, tareas trazables y handoffs
seguros para agentes. No objetivo: implementar el producto, instalar CrewAI,
ejecutar crews ni acreditar cumplimiento regulatorio.

## Decisions

- Fuente original inmutable en docs/requirements con IDs estables en el indice.
- ADR y C4 describen el objetivo y mantienen estado Propuesto hasta revision.
- Esquema OpenSpec estandar `spec-driven`; no inventar claves de workflow o CLI.
- Delta specs cubren el proceso y el contrato de busqueda solicitado. Las tres HU
  activas se refinan sin confundir este documento con aprobacion de todo el producto.
- Commands, ledger, idempotencia, outbox, usuarios con clave hasheada y contactos
  persisten en PostgreSQL. El worker
  proyecta movimientos/conceptos a Meilisearch con consistencia eventual; consulta
  por referencia y comprobaciones financieras siguen en PostgreSQL.
- No escribir PostgreSQL y Meilisearch en paralelo desde un command. Confirmar
  outbox con la transaccion financiera y avanzar checkpoint solo tras indexacion
  confirmada. Probar replay, eventos fuera de orden y reconstruccion desde SQL.
- El BFF valida sesion de servidor y ownership; el cliente no accede directamente
  al indice. No hay proveedores externos ni simulados (sin WireMock) ni Keycloak:
  los pagos son transferencias entre contactos en una transaccion local ACID.
- Todo el entorno se empaqueta en imagenes OCI, con Compose verificable usando
  Docker o el proveedor Compose de Podman Desktop; runner CrewAI incluido.
- CrewAI se declara en YAML de agentes/tareas; requiere wiring Python y Flow
  posterior. El contrato de gates es documental, no un control ya instalado.
- Cada handoff incluye change ID, HU/CA, Q pendientes, rutas de contexto,
  version de artefactos y salida esperada. Herramientas futuras deniegan por defecto.

## Refinement Scope

1. HU-01: pasos, validacion de identidad interna, usuarios con clave hasheada, activacion, eventos y frontera de duracion.
2. HU-02: destino (contacto)/monto, limites, ledger, fondos y terminalidad.
3. HU-04: claves, fingerprint, concurrencia, retencion y recuperacion, incluida
  evidencia que distingue originales/reintentos segun CA4 sin activar HU-06.

Extension HU-02 CA3: movimientos y conceptos buscables, filtros y paginacion
aprobados en Q-17; retraso de indexacion visible, aislamiento y pruebas de reindex.
La secuencia funcional no habilita pagos antes de verificar los invariantes de
idempotencia. QR, soporte/disputas y conciliacion diaria no tienen tareas activas.

## Risks / Trade-offs

Un CLI puede declarar artefactos completos aunque las decisiones sigan abiertas:
el gate humano revisa contenido, no solo presencia. YAML puede describir agentes
pero no darles acceso a archivos: el futuro runner debe proveer contexto seguro.
Los diagramas pueden quedar obsoletos: cada cambio tecnico debe revisar ADR/C4.
El indice puede estar atrasado o caido sin que el pago haya fallado: separar
errores de busqueda del resultado financiero y mantener consulta autoritativa.

## Verification

Verificar hashes de originales, enlaces locales, estructura YAML, agentes y
referencias de contexto, y validacion estricta del cambio con OpenSpec. Los
escenarios de la delta spec se verifican mediante revision documental ahora y
pruebas del runner cuando exista; no fingir pruebas de runtime en esta entrega.

## Open Questions

Las Q aplicables siguen abiertas en el registro central; Q-06/Q-08/Q-09 se
difieren con sus HU. Q-17 define conceptos y filtros; Q-16 fija imagenes y
compatibilidad Podman/Compose. Los agentes no pueden
cerrarlas en nombre de producto ni convertir limites propuestos en reglas legales.