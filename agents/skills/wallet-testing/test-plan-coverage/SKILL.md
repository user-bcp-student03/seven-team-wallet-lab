---
name: test-plan-coverage
description: Procedimiento para definir cobertura de pruebas de API y frontend mediante técnicas ISTQB y trazabilidad, y ejecutar casos funcionales manuales autorizados.
---

# Test Plan and Coverage

## Cuándo usar

Cuando un requisito, cambio o sistema aprobado necesita una estrategia y matriz de cobertura, y ejecutar casos funcionales manuales aprobados en un ambiente autorizado.

## Entradas

- criterios de aceptación aprobados del sistema o cambio bajo prueba;
- requisitos, historias o spec aprobada que contextualizan los criterios de aceptación;
- para una API, contrato Swagger/OpenAPI correspondiente a la versión bajo prueba, en archivo YAML/JSON o URL accesible;
- alcance del sistema y componentes/contratos afectados;
- arquitectura, riesgos conocidos y documentación de pruebas existente;
- requisitos no funcionales, objetivos de servicio, perfiles de uso y estándares de seguridad, accesibilidad o usabilidad aplicables, si están disponibles;
- restricciones de ambientes, datos, herramientas y tiempo, si están definidas.

## Procedimiento

1. Confirma el alcance, las fuentes aprobadas y los objetivos de calidad.
2. Revisa la arquitectura, los contratos, las pruebas existentes y sus resultados disponibles. Para una API, contrasta los criterios de aceptación con el contrato Swagger/OpenAPI y revisa operaciones, parámetros, cuerpos de solicitud, esquemas, respuestas, códigos de estado y requisitos de seguridad declarados.
3. Identifica escenarios principales, alternos, límites, errores y comportamiento que debe preservarse.
4. Evalúa riesgos por impacto y probabilidad; prioriza escenarios según el riesgo y los criterios de aceptación.
5. Selecciona niveles y tipos de prueba adecuados, por ejemplo: unitarias, integración, contrato, sistema, aceptación, regresión, rendimiento o seguridad, según el alcance y la evidencia. Evalúa explícitamente la aplicabilidad de performance, seguridad y usabilidad siguiendo la guía de cobertura no funcional; propone escenarios pertinentes y justifica los no aplicables.
6. Define qué se probará y qué queda fuera, con su justificación.
7. Selecciona y justifica las técnicas de diseño de pruebas según ISTQB usando la guía siguiente. Deriva los casos y sus elementos de cobertura; asigna cada escenario a un nivel y especifica precondiciones, datos, pasos y resultado esperado de forma verificable.
8. Construye trazabilidad entre requisito/criterio, riesgo, escenario y prueba existente o planificada. Para una API, identifica también el método HTTP y la ruta de la operación del contrato Swagger/OpenAPI relacionada.
9. Define cobertura relevante para el sistema y por técnica: requisitos y escenarios; componentes e interfaces; particiones, valores límite, reglas y transiciones seleccionadas. Registra denominador, objetivo, casos asociados y exclusiones justificadas. Separa cobertura diseñada, ejecutada y resultados satisfactorios; no uses una métrica de líneas como sustituto de cobertura funcional.
10. Determina qué conviene automatizar, qué requiere evaluación manual y por qué.
11. Registra dependencias, ambiente, datos de prueba, herramientas, responsables, criterios de entrada/salida y riesgos residuales.
12. Señala vacíos, contradicciones y supuestos; no inventes requisitos para cerrarlos.
13. Genera o actualiza `testing-coverage.md` con la estructura de salida indicada. Para cada caso, registra la cobertura prevista, la técnica, la modalidad manual o automatizada y el nivel de prueba; no declares ejecución sin evidencia.
14. Después de definir la cobertura funcional, identifica los casos manuales que puedes ejecutar según los criterios aprobados, el ambiente autorizado, las herramientas y los datos disponibles. Ejecuta los casos que cumplan esas condiciones; para cada caso manual, registra `EJECUTADO` si se realizó y adjunta evidencia y resultado, o `NO EJECUTADO` si no se realizó, indicando el motivo. Un caso ejecutado puede tener resultado satisfactorio o no satisfactorio; no confundas el estado de ejecución con el resultado.
15. No ejecutes casos si falta aprobación, autorización del ambiente o condiciones seguras, ni inventes evidencia. En esos casos registra `NO EJECUTADO` y el bloqueo o motivo concreto.
16. Detente para revisión humana antes de tratar el plan como aprobado.

## Análisis y selección de técnicas según ISTQB

No existe una técnica universalmente mejor para API o frontend. Selecciona la técnica o combinación más adecuada según la base de prueba, el comportamiento, los riesgos y las restricciones; justifica su elección por requisito o funcionalidad. Distingue técnicas de diseño de niveles y tipos de prueba.

| Técnica | Cuándo elegirla | Aplicación en API | Aplicación en frontend | Elementos de cobertura |
|---------|----------------|-------------------|------------------------|------------------------|
| Partición de equivalencia | Entradas o salidas agrupables con el mismo comportamiento esperado | Clases válidas e inválidas de parámetros, campos y respuestas según contrato | Clases válidas e inválidas de campos, filtros y selecciones | Particiones identificadas, incluidas las inválidas |
| Análisis de valores límite | Particiones ordenadas con fronteras definidas | Límites de longitud, rango y paginación declarados | Límites de longitud, fechas, cantidades y rangos de controles | Valores de cobertura definidos para cada frontera según la variante de 2 o 3 valores elegida |
| Tablas de decisión | Resultados dependientes de combinaciones de condiciones | Reglas de negocio, permisos y combinaciones de parámetros | Visibilidad, habilitación y validación condicionadas por reglas | Columnas/reglas factibles de la tabla; justificar combinaciones imposibles o excluidas |
| Transición de estados | El resultado depende del estado y de eventos previos | Ciclos de vida de recursos, sesiones y secuencias de operaciones | Navegación, formularios multipaso y estados de interfaz | Estados, transiciones válidas o todas las transiciones, incluidas las inválidas, según el criterio elegido |

- Para API, deriva el modelo desde los criterios de aceptación y Swagger/OpenAPI. Complementa los esquemas con reglas de negocio y secuencias que el contrato no describa; registra las ambigüedades en lugar de asumir resultados.
- Para frontend, deriva el modelo desde los criterios de aceptación y los flujos, diseños o reglas disponibles. Incluye estados de carga, vacío, error y éxito cuando correspondan; trata accesibilidad y compatibilidad como tipos/objetivos de prueba, no como técnicas de diseño.
- Complementa con técnicas basadas en la experiencia, como predicción de errores, pruebas exploratorias y listas de comprobación, cuando aporten valor según el riesgo. Registra objetivos, tiempo y hallazgos; no les atribuyas porcentajes de cobertura estructural no medidos.
- Usa técnicas de caja blanca, como cobertura de sentencias o ramas, solo si hay acceso al código y herramientas de medición. No infieras estas coberturas desde casos de API o interfaz.
- Para cada técnica, calcula la cobertura sobre un conjunto explícito: elementos cubiertos / elementos identificados en alcance x 100. Al planificar, indica los elementos abordados por casos diseñados; tras ejecutar, distingue elementos ejercitados y resultados. Si el conjunto no está definido, reporta cobertura pendiente de determinar, no un porcentaje.
- Acuerda objetivos de cobertura según riesgo y restricciones. No fijes un porcentaje universal ni declares cobertura global sumando porcentajes de técnicas distintas.

## Propuesta de cobertura no funcional

Analiza cada característica según el sistema bajo prueba, sus usuarios, exposición, criticidad y condiciones de operación. No incluyas todas las pruebas por rutina ni descartes una característica solo por tratarse de API o frontend.

| Característica | Aplicación en API | Aplicación en frontend | Métricas o criterios a acordar |
| --- | --- | --- | --- |
| Performance / rendimiento | Carga esperada, picos, estrés o resistencia según riesgo; concurrencia, volumen de datos y consumo de recursos | Carga de páginas y recursos, respuesta de interacciones y flujos bajo condiciones representativas de dispositivo y red | Latencia por percentil, throughput, tasa de error, uso de recursos; LCP, INP y CLS cuando apliquen; perfil de carga y duración |
| Seguridad | Autenticación, autorización por rol y recurso, validación de entradas, protección de datos y límites de consumo | Gestión de sesión, controles de acceso efectivos en el servidor, exposición de datos y tratamiento seguro de contenido | Accesos permitidos/denegados según matriz de permisos, ausencia de exposición en escenarios definidos y cumplimiento de controles aplicables; referencias OWASP cuando correspondan |
| Usabilidad | Facilidad de uso para consumidores: claridad de documentación, errores y consistencia del contrato | Comprensión y finalización de tareas por usuarios representativos, navegación, formularios y recuperación de errores | Éxito y tiempo por tarea, errores de usuario y valoración de participantes; revisión de documentación o experiencia de integración para API |
| Accesibilidad y compatibilidad | Compatibilidad de clientes y versiones soportadas según contrato | Navegación por teclado, foco, tecnologías de asistencia, navegadores y dispositivos soportados | Criterios WCAG aplicables y matriz de compatibilidad acordada; las comprobaciones automáticas no sustituyen toda la evaluación manual |

1. Registra para cada característica si aplica, su justificación, riesgo y escenarios propuestos. Evalúa otras, como fiabilidad o recuperación, si el contexto lo requiere.
2. Relaciona cada propuesta con un requisito no funcional existente o un riesgo identificado. Si no hay requisito aprobado, marca la propuesta como `PENDIENTE DE APROBACIÓN`; no la conviertas implícitamente en compromiso ni en criterio de salida obligatorio.
3. Define alcance, ambiente, datos, perfil de carga o participantes cuando corresponda, método de evaluación y métrica. Usa umbrales aprobados; si faltan, registra `POR DEFINIR` y solicita su acuerdo, sin inventar valores ni declarar cumplimiento.
4. Incorpora los casos propuestos en la matriz general con IDs, técnica o método justificado, modalidad manual o automatizada y nivel de prueba. No fuerces una técnica de caja negra si el objetivo requiere medición, revisión especializada o evaluación con usuarios.
5. Delimita cobertura por característica: operaciones, roles, controles, tareas, páginas o configuraciones consideradas y excluidas. No interpretes un resultado favorable como garantía de seguridad, usabilidad o rendimiento de todo el sistema.
6. Antes de ejecutar pruebas de carga, estrés o seguridad activa, exige autorización explícita, ambiente permitido, límites de impacto y condiciones de detención. Para estas pruebas no funcionales, este skill solo propone y planifica; no las ejecuta.

## Reglas

- no modificar la implementación ni crear pruebas automatizadas como parte de la planificación; ejecutar pruebas funcionales manuales solo en un ambiente autorizado y con datos sintéticos;
- no afirmar cobertura total sin trazabilidad y evidencia;
- no confundir cantidad de pruebas o cobertura de código con cobertura suficiente del riesgo;
- no duplicar pruebas existentes sin justificar el valor de la duplicación;
- proteger contratos y comportamiento existente, salvo cambio aprobado explícitamente;
- usar datos sintéticos y nunca incluir secretos o datos personales reales;
- mantener fuera del plan los hallazgos no aprobados y registrar los riesgos residuales.

## Salida mínima

Genera un archivo Markdown llamado `testing-coverage.md` en el directorio de documentación de pruebas del proyecto; si no existe una convención, ubícalo en la raíz del repositorio bajo prueba. Si ya existe, actualiza únicamente el alcance relacionado y conserva el contenido ajeno al cambio.

La matriz debe incluir una fila por caso de prueba y distinguir:

- cobertura de pruebas: requisito/criterio, escenario y elemento de cobertura abordado;
- técnica de diseño o método de evaluación: técnica ISTQB seleccionada y variante, cuando aplique; para pruebas no funcionales, indica el método de medición, revisión o evaluación y justifica su elección;
- modalidad de ejecución: `Manual` o `Automatizada`, con justificación; si un escenario requiere ambas, desglósalo en casos separados;
- nivel de prueba: componentes/unitarias, integración de componentes, sistema, integración de sistemas o aceptación, según corresponda;
- tipo de prueba: funcional o no funcional, indicando la característica específica (performance, seguridad, usabilidad u otra), separado del nivel y de la modalidad;
- estado y evidencia: para cada caso manual usa `EJECUTADO` o `NO EJECUTADO`; registra resultado y evidencia solo si existe evidencia real, y explica por qué no se ejecutó cuando corresponda. Para casos automatizados, distingue los estados de diseño, implementación y ejecución sin atribuir resultados no verificados.

Usa la siguiente estructura sin inventar filas, porcentajes ni resultados para completar la plantilla:

```markdown
# Cobertura de pruebas

## Fuentes y versión bajo prueba
## Objetivo y alcance
## Fuera de alcance
## Riesgos y prioridades
## Estrategia por nivel/tipo de prueba
## Propuesta de cobertura no funcional

| Característica | Aplica y justificación | Requisito o riesgo fuente | Escenarios e IDs de casos | Alcance y exclusiones | Método y métrica | Umbral aprobado o POR DEFINIR | Ambiente y condiciones | Estado de aprobación |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Técnicas ISTQB seleccionadas y justificación por funcionalidad
## Modelo de cobertura y objetivos por técnica

| Funcionalidad API/frontend | Técnica/variante | Elementos en alcance | Objetivo | Casos asociados | Exclusiones justificadas |
| --- | --- | --- | --- | --- | --- |

## Matriz de trazabilidad y cobertura

| ID caso | Requisito/criterio o propuesta de riesgo | Operación API o flujo frontend | Riesgo | Escenario | Elemento de cobertura | Técnica/variante o método | Modalidad (Manual/Automatizada) | Justificación de modalidad | Nivel de prueba | Tipo/característica de prueba | Estado | Evidencia/resultado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Resumen de cobertura por técnica

| Técnica/alcance | Total de elementos | Elementos con casos diseñados | Cobertura diseñada (%) | Elementos ejercitados | Cobertura ejecutada (%) | Resultados satisfactorios y evidencia |
| --- | --- | --- | --- | --- | --- | --- |

## Ambiente, herramientas y datos
## Criterios de entrada y salida
## Automatización y pruebas manuales
## Vacíos, supuestos y riesgos residuales
## Decisiones abiertas
```
