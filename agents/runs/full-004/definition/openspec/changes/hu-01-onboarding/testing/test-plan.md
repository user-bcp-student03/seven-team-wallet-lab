# Plan de pruebas — HU-01 Onboarding

## Estado y objetivo

Plan documental para revisión humana; no es aprobación, aceptación de HU-01 ni evidencia de ejecución. El producto wallet no está construido según el contexto recibido. El alcance es exclusivamente HU-01 y sus CA1–CA6. El trabajo aquí define cobertura; no crea pruebas automatizadas ni modifica producto.

Objetivos: verificar el flujo guiado y sus validaciones, el alta y activación, los eventos analíticos y sus oráculos delegados de laboratorio; identificar riesgos de concurrencia, recuperación, ownership, privacidad y reproducibilidad. Se usarán exclusivamente datos sintéticos.

## Fuentes y versión bajo prueba

- HU-01, «Registro y activación del MVP de wallet», CA1–CA6 y BUSSINESS_RULES.md incluidos en el contexto.
- Decisiones de laboratorio registradas Q-01, Q-11 y Q-16; decisiones delegadas de laboratorio Q-02, Q-03 y Q-13 descritas en las fuentes recibidas. Son valores del caso de estudio, no políticas de producción ni cierres formales de las preguntas originales.
- Especificación OpenSpec `specs/identity-onboarding/spec.md`, diseño `design.md`, borrador `api/openapi.yaml`, controles Security y arquitectura objetivo. Son propuestas; el OpenAPI no está aprobado y la arquitectura no está implementada.
- HU-02 y HU-04 se consultan únicamente para delimitar dependencias. No son alcance de prueba de esta HU.

No se proporcionó una versión ejecutable de la wallet ni evidencia confiable de pruebas anteriores. El borrador OpenAPI propone `POST /api/v1/onboarding/registrations`, pero no debe tratarse como contrato aprobado.

## Alcance

- CA1: secuencia de pasos requeridos, paso actual y experiencia web responsive en Edge, Chrome y Safari.
- CA2: datos obligatorios, validación cliente/servidor, bloqueo de avance y mensajes accionables; unicidad y concurrencia de registros; rollback y privacidad.
- CA3: alta válida, estado activo, mensaje de éxito y Home. El punto de entrada de pagos queda sujeto a resolver el límite de alcance descrito en «Bloqueos y preguntas».
- CA4–CA6: eventos de onboarding y oráculos analíticos de laboratorio para duración, usuarios activos, MAU, CAC y retención.
- Aislamiento de identidad desde la sesión y rechazo de autoridad enviada por el cliente, hasta donde lo permita el contrato HU-01 disponible.
- Reproducibilidad de entorno OCI/Compose compatible con Podman Desktop, planificada como validación de plataforma; no ejecutada.

## Fuera de alcance

- Ejecutar pagos, mover fondos, validar ledger financiero o probar idempotencia/replay/conflicto de pagos. Pertenecen a HU-02/HU-04; HU-01 no contiene una operación de pago ni contrato de clave idempotente. No inferir que el alta habilita transferencias.
- Pruebas de lag, caída y reindexación de Meilisearch: HU-01 no debe depender de Meilisearch. Estos escenarios corresponden a la proyección de movimientos de HU-02. Sí se planifica verificar que onboarding funciona sin Meilisearch.
- KYC o proveedores reales/simulados, datos reales, gasto real, medición real de cohortes y evaluación regulatoria.
- Pruebas de carga, estrés o seguridad activa durante esta definición. Se proponen donde aportan valor, con umbrales y autorización pendientes; no se ejecutan.
- Acceso cruzado a un recurso de identidad por ID si no existe una operación HU-01 que permita consultarlo o modificarlo. El borrador no describe tal operación; no se inventa una ruta.

## Riesgos y prioridades

| Prioridad | Riesgo | Cobertura propuesta |
| --- | --- | --- |
| Alta | Altas simultáneas podrían crear identidades duplicadas o dejar datos parciales. | T-HU01-03A: restricciones de unicidad, concurrencia y rollback contra PostgreSQL. |
| Alta | El borrador OpenAPI distingue alta nueva (201) y colisión de celular/correo (422), lo que permite inferir existencia pese al mensaje genérico. | T-HU01-03B: comparar status, cuerpo, headers, cookies y forma observable; no concluir mitigación sin resolver el diseño. |
| Alta | CA3 y el diseño de seguridad no definen una respuesta compatible entre éxito con sesión/Home y privacidad de datos existentes. | Decisión de Producto/Security antes de construcción; conservar la excepción de mensaje DNI duplicado como punto a revisar. |
| Alta | Activar la wallet podría interpretarse como habilitar pagos, aunque estos dependen de HU-02/HU-04. | T-HU01-04 y límite explícito: alta no ejecuta pagos. |
| Media | Validación distinta entre UI y servidor; límites o errores podrían ser inconsistentes. | T-HU01-02A/B: clases de equivalencia y límites declarados. |
| Media | Eventos duplicados, ausentes o con datos personales podrían falsear métricas o exponer datos. | T-HU01-05/06/07 y revisión de telemetría sintética. |
| Media | No se acredita compatibilidad de navegador ni despliegue reproducible. | T-HU01-01M y T-HU01-09, pendientes de ambiente autorizado. |
| Dependencia futura | Replay/conflicto idempotente, doble gasto y recuperación financiera no pertenecen a HU-01. | Handoff HU-04: pruebas PostgreSQL para clave igual/payload igual, clave igual/payload distinto, crash y reintento; no se ejecutan ni se incluyen como aceptación de HU-01. |

## Estrategia y niveles

- **Componentes/unitarias:** validadores de formato y transiciones de UI, si se implementan; frontend-tests usa Vitest/jsdom. Las pruebas se proponen, no se crean en esta etapa.
- **Integración de componentes:** alta, validación de servidor, unicidad, transacción y eventos con backend-tests contra PostgreSQL efímero real indicado por el contexto.
- **Sistema:** flujo de alta y navegación entre UI y API, solo cuando exista producto ejecutable y criterios/contrato revisados. La URL y ambiente no están disponibles.
- **Aceptación/manual:** observación de pasos, mensajes, Home y responsive en Edge, Chrome y Safari. Todos los casos manuales quedan `NO EJECUTADO` porque no hay ambiente ni herramientas en el runner.
- **Plataforma:** revisión y ejecución humana posterior de OCI/Compose reproducible con datos sintéticos. El check `openspec` solo verifica artefactos; no acredita arranque de contenedores.
- **No funcional:** planificación de rendimiento, seguridad, usabilidad, compatibilidad y recuperación en `coverage.md`. No ejecutar carga/estrés o seguridad activa desde este plan.

## Escenarios y datos sintéticos

Los IDs y el mapeo completo están en `coverage.md`. Preparar fixtures sintéticos y aislados por caso: DNI `12345678`, celular `987654321`, correo bajo `example.test` y contraseña ficticia compatible con la decisión Q-11. No reutilizar estos valores fuera de pruebas. No incluir PII, contraseñas, cookies o tokens en logs o telemetría.

Para límites se proponen valores de longitud: DNI 7/8/9; celular 8/9/10; contraseña 7/8/20/21. Usar valores válidos e inválidos de cada partición acordada. La regla de correo requiere resolver la contradicción entre «alfanumérico, sin caracteres especiales» y correo con dominio válido; no derivar un oráculo hasta esa decisión.

Para concurrencia: lanzar registros sintéticos independientes en barrera concurrente contra el mismo DNI y, en ejecuciones separadas, el mismo celular o correo. Comprobar en PostgreSQL que existe como máximo una identidad por identificador y que no queda alta parcial. Inyectar fallo de prueba tras comenzar la persistencia para comprobar rollback, sin cambiar código funcional como parte de este plan.

Para analítica se propone un fixture sintético de tres flujos completados con duraciones de 2, 4 y 6 minutos, cuyo oráculo de mediana es 4 minutos, más un flujo abandonado tras 30 minutos de inactividad que no integra la mediana de éxitos. Para CA6, usar tres activaciones sintéticas y PEN 30 de gasto atribuido para comprobar CAC PEN 10; si falta gasto o denominador, el resultado esperado es desconocido, no cero. Estos son fixtures de prueba, no resultados observados ni evidencia de cohortes reales.

## Entrada y salida propuestas

**Entrada:** alcance HU-01 confirmado; revisión humana de este plan; resolución o aceptación explícita de las preguntas de diseño que afectan oráculos; build ejecutable disponible; ambiente autorizado; PostgreSQL efímero para `backend-tests`; frontend-tests disponible; fixtures sintéticos; autorización y límites para cualquier validación no funcional activa. El OpenAPI debe revisarse antes de usarlo como contrato.

**Salida:** cada CA trazado a casos; resultados y evidencia reales registrados por el ejecutor confiable; defectos y bloqueos visibles; sin pagos habilitados desde HU-01. Un plan generado no es aprobación humana. La aceptación del plan requiere revisión humana independiente. Los casos automatizados permanecen diseño pendiente hasta autorización posterior y precondiciones de implementación satisfechas.

## Bloqueos y preguntas para revisión humana

1. **Privacidad del registro:** resolver la diferencia observable entre alta nueva (201 con sesión/Home) y colisión de celular/correo (422) descrita por el OpenAPI propuesto, frente a la expectativa de respuestas y tiempos comparables. Mantener explícita la excepción existente de mensaje para DNI duplicado y revisar su compatibilidad. No afirmar que el mensaje genérico elimina enumeración.
2. **CA3 y pagos:** aclarar qué significa poder acceder al «punto de entrada de pagos de bajo monto» sin habilitar la ejecución de pagos antes de HU-02/HU-04. El plan no afirma que Home deba permitir transferir.
3. **Formato de correo:** resolver la tensión entre la regla «alfanumérico, sin caracteres especiales» y un correo con dominio válido antes de fijar todos los casos de formato.
4. **Ownership:** no existe en el OpenAPI provisto una operación HU-01 de consulta/modificación de identidad de otro usuario. Definir la superficie antes de exigir un caso de acceso cruzado; entretanto, probar solo que el cliente no controla la identidad mediante `ownerId/userId` y registrar el límite.
5. La cantidad/nombres de pasos concretos no están definidos en la HU. Validar los pasos requeridos y el paso actual sin fijar un número de pasos no aprobado.

Las decisiones delegadas Q-02/Q-03/Q-13 se conservan como decisiones solo del laboratorio y no son motivo para inventar métricas observadas. La ausencia de ejecución se registra como tal, no como defecto del producto.