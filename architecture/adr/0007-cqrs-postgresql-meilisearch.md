# ADR-0007: CQRS con PostgreSQL y Meilisearch

- Fecha: 2026-10-23
- Estado: Stack acordado por solicitud humana; diseno detallado propuesto.
- Referencias: HU-02 CA3, HU-04; Q-12, Q-13, Q-16, Q-17.
- Complementa ADR-0001/0002; reemplaza la propuesta inicial de busqueda solo SQL.

## Contexto

El alcance activo se reduce a HU-01 -> HU-02 -> HU-04. Se solicita separar
persistencias CQRS y buscar movimientos y conceptos con Meilisearch. La semantica
de concepto, campos y filtros no figura en las HU originales y se define en Q-17.

## Decision

PostgreSQL aloja write model, ledger, cuentas/reservas, pagos, claves idempotentes,
auditoria y outbox. Es fuente de verdad tambien para lecturas de saldo,
estado por referencia, ownership actual y replay de una clave. Meilisearch aloja
un indice derivado para consultas de movimientos/conceptos; no es ledger ni
autoridad de autorizacion financiera. CQRS no implica que toda query use el indice.

La transaccion SQL confirma cambio financiero y outbox; el worker del monolito
indexa de forma asincrona. Evitar dual write SQL/indice dentro del command. Una
respuesta de tarea aceptada por Meilisearch no demuestra indexacion completada:
esperar estado exitoso antes del checkpoint durable; reintentar fallos acotados y
guardar trabajo recuperable para investigar, sin volver a ejecutar el pago.

Usar ID estable por movimiento y fuente versionada. Serializar trabajo por
movimiento o releer el ultimo snapshot SQL antes de proyectar, sin asumir soporte
de compare-and-set del indice. Cubrir orden entre upsert/borrado, retries y crash
tras indexar pero antes del checkpoint. Reindexar a un indice nuevo, capturar
actualizaciones concurrentes via watermark/outbox y cambiar el indice activo
solo despues de comprobar completitud y aislamiento.

## Seguridad y contrato de busqueda

El navegador solo consulta el BFF. Este deriva propietario/ambito de la sesion,
impone filtros no reemplazables por el cliente y verifica ownership actual en
PostgreSQL antes de devolver resultados. Restringir tambien snippets, facets y
conteos; no devolver agregados de documentos que no pasen la autorizacion actual.
Un error de filtro o configuracion debe fallar cerrado, nunca buscar sin scope.

Indexar solo campos aprobados: identificador estable, propietario interno y
concepto/fecha/tipo segun Q-17. Importes/estados, si se incluyen, son proyecciones
no autoritativas. No indexar documentos de identidad, claves, hashes, tokens, DNI ni claves idempotentes. El concepto es texto potencialmente sensible: definir
limites, retencion y tratamiento antes de construir. Busqueda por texto no implica
embeddings, IA semantica ni clasificacion automatica sin aprobacion.

Separar claves de administracion, indexacion y consulta con permisos minimos.
Solo servicios internos acceden a Meilisearch; credenciales fuera de Git y nunca
en Angular. Borrados/retencion deben propagarse y verificarse, incluidos reindex
y restauracion. Un resultado atrasado no puede divulgar datos ya no autorizados.

## Ejecucion y operacion

Todo en contenedores OCI, Compose compatible con Docker y Podman Desktop:
PostgreSQL y Meilisearch con volumenes independientes, healthchecks e imagenes
fijadas; red interna para el indice y la base. Aplicaciones, observabilidad,
OTel y el runner CrewAI tambien se ejecutan en contenedores. Validar proveedor
de `podman compose` y no asumir que Podman Desktop lo instala/configura por si solo.

Medir lag de indexacion, edad/backlog outbox, tareas fallidas y duracion de reindex.
La API distingue busqueda no disponible, resultados vacios y proyeccion atrasada;
la UI mantiene consulta SQL por referencia y nunca interpreta ausencia de hit
como pago fallido. Q-12/Q-17 fijan frescura y UX, no se inventa un SLA.

## Alternativas y consecuencias

Solo PostgreSQL seria mas simple pero no cumple la seleccion solicitada.
Meilisearch como fuente de saldos compromete consistencia; escribir en ambas
bases desde el command crea fallos parciales. Se acepta operacion de dos almacenes
y consistencia eventual de busqueda a cambio de un indice especializado.

## Verificacion requerida

Pruebas contra ambos motores reales en contenedores: busqueda por concepto,
dos propietarios, filtros manipulados, datos de permiso obsoletos, caida del
indice, duplicados/fuera de orden, tarea fallida, crash/checkpoint y reindex con
pagos concurrentes. Comprobar que ledger e idempotencia no cambian al perder el
indice. Esta entrega documenta estas pruebas; todavia no las ejecuta.