---
name: automated-test-implementation
description: Procedimiento experto de automatización de casos de testing-coverage.md con Karate DSL para API basado en Swagger/OpenAPI y Selenium WebDriver para frontend.
---

# Automated Test Implementation

## Cuándo usar

Cuando se necesita implementar o completar los casos aprobados para automatización en `testing-coverage.md`, usando Karate DSL para API y Selenium WebDriver para frontend. Aplica prácticas de automatización mantenible, aislamiento, sincronización y validación de resultados observables.

## Entradas

- `testing-coverage.md` aprobado, con IDs de casos, criterios, escenarios, modalidad, técnica o método, nivel de prueba y resultados esperados o referencias que los definan;
- criterios de aceptación y documentación de pruebas relacionados;
- para API, contrato Swagger/OpenAPI de la versión bajo prueba, en YAML/JSON o URL accesible, y URL base del ambiente autorizado;
- para frontend, URL del ambiente autorizado, flujos y comportamiento esperado, navegadores soportados y acceso a la interfaz o al DOM para identificar localizadores;
- repositorio, componente y branch de trabajo, herramientas disponibles, configuración del ambiente y datos sintéticos; referencias a mecanismos seguros de credenciales, nunca sus valores.

## Precondiciones

No comenzar sin:

```text
testing-coverage.md disponible y casos de modalidad Automatizada aprobados e identificables
alcance, comportamiento esperado y criterios verificables
contrato Swagger/OpenAPI disponible para los casos de API
flujos y acceso a la interfaz o al DOM disponibles para los casos de frontend
repositorio, componente y branch de trabajo confirmados
```

Si falta una precondición o hay ambigüedad que cambie el comportamiento esperado, registra la pregunta y detente para revisión.

## Procedimiento

1. Lee `testing-coverage.md`, los criterios relacionados y la documentación de pruebas. Selecciona únicamente los casos aprobados con modalidad `Automatizada`; conserva los casos manuales y las propuestas pendientes sin automatizarlos por iniciativa propia.
2. Clasifica los casos seleccionados como API o frontend, manteniendo su nivel de prueba y técnica de diseño. Para flujos mixtos, identifica las verificaciones de cada capa y conserva su relación con el caso original.
3. Revisa estructura, dependencias, fixtures, convenciones y comandos disponibles. Reutiliza el arnés compatible y las utilidades existentes. Si falta el arnés requerido, incorpora una configuración mínima y aislada para Karate DSL o Selenium WebDriver con versiones compatibles y dependencias declaradas; no migres suites ajenas al alcance.
4. Relaciona cada ID de caso con un escenario de `testing-automate.feature` y sus archivos de soporte. Prioriza por riesgo y evita duplicar cobertura existente.
5. Genera o actualiza `testing-automate.feature` con escenarios Gherkin ejecutables siguiendo la guía API o frontend de este skill; no entregues solo pseudocódigo. Conserva los datos, particiones, límites, reglas y transiciones definidos en la cobertura, sin ampliar el alcance aprobado.
6. Parametriza ambientes, datos y configuración; mantén las pruebas independientes del orden de ejecución y controla la preparación y limpieza de datos sintéticos.
7. Ejecuta primero el caso agregado o modificado y después la suite relevante y las validaciones requeridas. Registra comando, ambiente, versión bajo prueba, cantidades, resultado y ubicación del reporte, sin exponer secretos.
8. Distingue fallos de producto, fallos de prueba y problemas de configuración/ambiente. Corrige primero la invocación o configuración de pruebas cuando corresponda y repite el mismo caso antes de concluir; no modifiques código funcional salvo autorización explícita.
9. Si faltan acceso, dependencias, navegador o ambiente, registra el bloqueo y deja la ejecución pendiente; una compilación exitosa no demuestra que la prueba pasó.
10. Actualiza en `testing-coverage.md` solo los casos del alcance, vinculando ID, ruta de `testing-automate.feature`, escenario, archivos de soporte y evidencia. Registra por separado el estado de implementación y el de ejecución según la sección de salida; conserva el resto del documento y no marques como aprobado un caso solo por estar implementado.
11. Revisa el diff y entrega las pruebas, configuración, instrucciones de ejecución, resultados reales y limitaciones. Si el comportamiento esperado contradice el contrato o los criterios, detente para revisión.

## Automatización de API con Karate DSL

1. Usa Swagger/OpenAPI como base técnica y los criterios de aceptación como base de negocio. Identifica método HTTP, ruta, parámetros, headers, autenticación, cuerpo, esquemas, respuestas y códigos de estado para cada caso; no infieras reglas ausentes del contrato.
2. Implementa `testing-automate.feature` como feature de Karate DSL con escenarios identificables por ID de cobertura, usando `Scenario Outline` y `Examples` cuando los casos requieran variaciones de datos. Sus pasos deben usar la sintaxis ejecutable de Karate; no los reemplaces por descripciones sin implementación.
3. Configura la URL base y opciones por ambiente mediante `karate-config.js` y el mecanismo de ejecución del proyecto. Obtén secretos mediante variables de entorno o el mecanismo seguro existente; no los incluyas en features ni reportes.
4. Construye solicitudes conforme al caso y verifica con las aserciones de Karate el código HTTP, headers relevantes, estructura, tipos y valores de negocio esperados. Cubre también solicitudes inválidas cuando estén planificadas; verificar solo el estado HTTP no basta.
5. Traduce las restricciones relevantes de Swagger/OpenAPI a verificaciones ejecutables o reutiliza validadores compatibles existentes. No declares validación completa del contrato si solo verificaste una parte de la respuesta.
6. Crea y elimina datos de forma controlada, usa identificadores únicos cuando sea necesario y evita depender de recursos compartidos mutables. Usa dobles solo cuando el nivel y alcance aprobados lo permitan, identificándolos en la evidencia.
7. Integra un runner compatible y reportes de Karate; documenta comandos reproducibles para un caso y para la suite API.

## Automatización de frontend con Selenium WebDriver

1. Define los escenarios de frontend en `testing-automate.feature` y conecta sus pasos Gherkin con definiciones ejecutables que usen Selenium WebDriver. Usa Cucumber u otro runner Gherkin compatible con el lenguaje del proyecto; no uses el runner de Karate para ejecutar estos pasos de Selenium. Si no existe arnés, define una configuración mínima reproducible con dependencias, navegador y gestión de driver compatibles.
2. Inspecciona la interfaz o el DOM real antes de elegir localizadores. Prioriza atributos estables como IDs o atributos dedicados a pruebas; evita XPath absolutos, selectores por posición y atributos dinámicos frágiles.
3. Encapsula interacciones reutilizadas en Page Objects o componentes cuando reduzcan duplicación; mantén las aserciones de negocio en los casos de prueba y vincula cada método con su ID de cobertura.
4. Usa esperas explícitas basadas en condiciones observables, sin pausas fijas ni mezcla de esperas implícitas y explícitas. Valida resultados visibles y estados de interfaz, no solo que una acción pudo ejecutarse.
5. Aísla sesiones y datos entre casos y garantiza `quit()` del WebDriver incluso si falla una prueba. Configura URL, navegador y modo headless sin valores de ambiente incrustados en los tests.
6. Ejecuta en los navegadores y configuraciones del alcance aprobado. Captura reportes, screenshots y diagnóstico pertinente ante fallos, protegiendo datos sensibles; no uses reintentos para ocultar inestabilidad.
7. Documenta comandos reproducibles para un caso y para la suite frontend, incluyendo requisitos de navegador y driver.

## Casos no funcionales

- Automatiza únicamente los escenarios no funcionales aprobados y soportados por el enfoque elegido; conserva sus métricas y umbrales acordados.
- Una comprobación aislada de tiempo de respuesta no sustituye una prueba de carga, y Selenium no demuestra por sí solo usabilidad o accesibilidad completas.
- Si el caso exige herramientas especializadas, evaluación humana o un enfoque no cubierto por Karate DSL/Selenium WebDriver, registra la limitación y solicita revisión; no sustituyas el objetivo por una comprobación más débil.
- Exige autorización, ambiente permitido, límites de impacto y condiciones de detención antes de ejecutar carga, estrés o seguridad activa.

## Reglas

- no inventar resultados ni declarar una prueba ejecutada si no se ejecutó;
- no modificar comportamiento de producción dentro de una tarea limitada a pruebas;
- no introducir datos reales, credenciales, secretos ni dependencias externas innecesarias;
- no eliminar o relajar assertions sin justificación aprobada;
- no sustituir Karate DSL para API ni Selenium WebDriver para frontend por otro framework sin aprobación;
- no omitir casos, desactivar gates o usar reintentos para presentar una suite fallida como exitosa;
- no perseguir cobertura numérica ignorando el riesgo o los criterios funcionales;
- no corregir hallazgos ajenos al alcance; regístralos con evidencia;
- si la prueba contradice la spec o el plan, detenerse y pedir revisión en lugar de reinterpretar el requisito.

## Salida mínima

Entrega obligatoriamente `testing-automate.feature`, el código de soporte ejecutable, las dependencias y configuración necesarias, instrucciones reproducibles y la actualización trazable de `testing-coverage.md`. No basta con proponer la implementación ni generar ejemplos desconectados de los casos aprobados.

### Archivo testing-automate.feature

- Ubícalo en el directorio de features reconocido por el runner del proyecto e informa su ruta. Si se automatizan API y frontend, usa un `testing-automate.feature` en cada suite, en directorios separados y con sus respectivos runners.
- Define `Feature` y los casos mediante `Scenario` o `Scenario Outline` con `Examples`. Usa pasos `Given`, `When`, `Then` y `And` para describir precondiciones, acciones y verificaciones; usa `Background` únicamente para preparación común.
- Conserva el ID de `testing-coverage.md` en el nombre del escenario y en una etiqueta válida, por ejemplo `@TC_001`. Si un esquema parametrizado representa varios IDs, conserva el ID de cada fila en `Examples` y en el nombre parametrizado del escenario.
- Cada caso debe tener datos y aserciones verificables que correspondan a su criterio de aceptación, no solo acciones ni escenarios vacíos. Para frontend, entrega todas las definiciones de pasos y componentes Selenium requeridos; para API, los pasos y recursos Karate requeridos.
- Si el archivo ya existe, integra únicamente los casos del alcance sin sobrescribir escenarios ajenos.

### Actualización de testing-coverage.md

Actualiza la matriz existente por ID, sin duplicar los casos. Añade columnas si hacen falta y conserva requisitos, técnica, modalidad, nivel y demás información de cobertura:

- `Automatización implementada`: `Sí`, `Parcial` o `No`, según exista la implementación completa del caso, incluidos pasos y soporte necesarios.
- `Archivo feature y escenario`: ruta de `testing-automate.feature`, nombre del escenario y referencia a la fila de `Examples`, cuando aplique; incluye referencias a las definiciones de pasos o recursos de soporte.
- `Estado de ejecución`: `No ejecutado`, `Bloqueado`, `Aprobado` o `Fallido`. Un caso implementado sin ejecución permanece `No ejecutado`; registra la causa cuando esté bloqueado.
- `Evidencia/última ejecución`: comando, ambiente, fecha, resultado y ruta del reporte real. Si no se ejecutó, indica que no hay evidencia de ejecución; no inventes reportes.

Marca `Automatización implementada: Sí` solo cuando el caso esté completamente implementado; usa `Estado de ejecución: Aprobado` únicamente si el caso se ejecutó y todas sus verificaciones pasaron. Registra fallos o bloqueos sin ocultarlos ni cambiar el resultado esperado para obtener aprobación.

```markdown
## Alcance automatizado
## Framework y configuración por sistema (Karate DSL / Selenium WebDriver)
## Requisitos/escenarios cubiertos
## Pruebas agregadas o modificadas
## Mapeo de casos a pruebas

| ID de testing-coverage.md | Sistema API/frontend | Archivo feature y escenario | Soporte ejecutable | Nivel | Automatización implementada | Estado de ejecución | Evidencia/última ejecución |
| --- | --- | --- | --- | --- | --- | --- | --- |

## Requisitos de ambiente y comandos de ejecución
## Comandos ejecutados y resultados
## Trazabilidad actualizada
## Fallos, limitaciones y cobertura pendiente
## Riesgos residuales
```