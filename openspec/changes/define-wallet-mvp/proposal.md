# Definir el MVP antes de construir

## Why

El incremento activo contiene HU-01 onboarding, HU-02 confirmacion de pago y
HU-04 idempotencia, en esa secuencia. No fija todavia validacion de identidad, estados, limites,
retencion idempotente ni semantica de busqueda por conceptos.
Construir ahora obligaria a inventar politicas financieras y criterios de exito.

## What Changes

- Establecer trazabilidad de HU-01, HU-02 y HU-04 y todos sus criterios de aceptacion.
- Diferir HU-03/HU-05/HU-06, preservando los siete documentos fuente.
- Separar PostgreSQL write model y Meilisearch para busqueda de movimientos/conceptos.
- Exigir todo el entorno en contenedores OCI/Compose compatible con Podman Desktop.
- Convertir preguntas abiertas en decisiones aprobadas o exclusiones explicitas.
- Completar contratos, modelo de estados, invariantes, amenazas y plan de pruebas.
- Preparar tareas acotadas para cambios de construccion posteriores.
- Definir handoffs CrewAI con aprobacion humana y evidencia por tarea.

## Capabilities

### New Capabilities

- `wallet-definition-workflow`: trazabilidad y gates de definicion, diseno y
  construccion supervisada del caso de estudio.
- `movement-search`: busqueda de movimientos y conceptos en Meilisearch como
  proyeccion eventual, reconstruible y autorizada del historial PostgreSQL.

### Modified Capabilities

Ninguna: no existe baseline funcional previa.

## Impact

Solo documentos en docs, architecture, openspec, agents y limites previstos de
backend/frontend/orchestration. HU afectadas: HU-01 CA1-6, HU-02 CA1-6 y
HU-04 CA1-4. La busqueda es una extension solicitada de HU-02 CA3, no una
modificacion del original. PostgreSQL mantiene ledger, pagos y claves; el indice
no decide resultados financieros. Docker/Podman alojaran tambien el runner CrewAI.

Fuera de alcance: HU-03, HU-05, HU-06, codigo ejecutable de wallet, runner CrewAI, dinero real,
integraciones reales, nube, certificacion bancaria, politicas legales inventadas.

## Approval And Blockers

Propuesta pendiente de revision humana. Revisar
[preguntas aplicables hasta Q-17](../../../docs/requirements/open-questions.md). Producto resuelve
reglas y metricas; arquitectura/seguridad/operaciones revisan los aspectos
tecnicos. Una pregunta solo bloquea los cambios que dependen de ella.

La aprobacion de esta estructura no aprueba todas las reglas del producto.
Para construccion se requiere un cambio posterior con specs/diseno/tareas
aprobados y registro vinculado a la version de sus artefactos.