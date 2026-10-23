# Propuesta: hu-01-onboarding

## Estado y alcance

Propuesta documental para HU-01, **Registro y activación del MVP de wallet**. Mantiene sus CA1–CA6 y su trazabilidad; no modifica la HU original. HU-02 y HU-04 siguen en la secuencia aprobada, pero no son parte de este cambio. HU-03, HU-05 y HU-06 permanecen diferidas.

El caso usa datos y dinero ficticios, sin proveedor externo ni simulado. La definición de onboarding no autoriza construir ni ejecutar pagos. La activación de HU-01 no sustituye la implementación y aceptación de HU-02/HU-04.

## Necesidad de producto

Ofrecer un onboarding web responsive, con pasos y validaciones observables, que permita completar el alta y llegar a Home del Wallet. El alta solicita tipo de documento DNI, número de documento, celular, correo y contraseña, conforme a las reglas y decisiones de laboratorio trazadas en la delta spec. Deben conservarse los mensajes de alta establecidos por la fuente.

## Trazabilidad de criterios

| HU/CA | Fuente | Requisito/delta | Escenario | Evidencia esperada |
| --- | --- | --- | --- | --- |
| HU-01/CA1 | HU-01, CA1; BUSSINESS_RULES.md, Tecnología/Navegadores | Mostrar pasos requeridos y paso actual; web responsive para Edge, Chrome y Safari | T-HU01-01 | Vitest/jsdom; validación manual en Edge, Chrome y Safari planificada, NO EJECUTADO |
| HU-01/CA2 | HU-01, CA2; BUSSINESS_RULES.md, Onboarding Wallet y Consideraciones | Bloquear avance ante campos obligatorios vacíos o inválidos; mensajes accionables sin revelar existencia de celular/correo | T-HU01-02, T-HU01-03 | backend-tests con PostgreSQL efímero y frontend-tests; evidencia por ejecutar |
| HU-01/CA3 | HU-01, CA3; BUSSINESS_RULES.md, Consideraciones del Onboarding | Alta válida activa la wallet y muestra Home del Wallet; no ejecuta pagos | T-HU01-04 | backend-tests y frontend-tests; escenarios HU-02/HU-04 fuera de este cambio |
| HU-01/CA4 | HU-01, CA4; Q-02 | Registrar inicio, finalización de cada paso y cierre; decisión delegada de eventos y frontera temporal | T-HU01-05 | openspec y pruebas backend; supuestos no verificados |
| HU-01/CA5 | HU-01, CA5; Q-02 | Medir mediana de duración y comparar meta de 8 a 3 minutos en el trimestre posterior al lanzamiento | T-HU01-05 | openspec; medición real no disponible en definición |
| HU-01/CA6 | HU-01, CA6; Q-03, Q-13 | Reportar conteos mensuales de nuevos usuarios activos y atribución de gasto para objetivos MAU/CAC; retención analítica delegada | T-HU01-05 | openspec; datos de campaña y resultados de cohorte no verificados |

## Decisiones de laboratorio y límites

- **Q-01, decisión registrada:** validación interna sintética por formato y unicidad; sin KYC ni sistema externo. DNI de 8 dígitos numéricos, celular de 9 dígitos numéricos, correo con dominio válido y contraseña según la decisión registrada Q-11. DNI duplicado: `El cliente ya existe`. Alta exitosa: `El cliente fue creado con exito` y Home del Wallet. Celular y correo únicos; sus comprobaciones no deben revelar si existen.
- **Q-02, decisión delegada (caso de estudio):** eventos `onboarding_started`, `onboarding_step_completed` y `onboarding_closed`; duración desde el primer evento de inicio hasta el cierre por finalización exitosa; 30 minutos de inactividad cierran el flujo como abandono. La mediana se calcula sobre finalizaciones exitosas del periodo/cohorte reportado. Justificación: define una frontera reproducible para el funnel sin atribuir duración a flujos abandonados. No verificado.
- **Q-03, decisión delegada (caso de estudio):** activación para estos indicadores = alta completada; contar usuarios únicos por mes de activación. CAC = gasto de adquisición atribuido al periodo/cohorte dividido entre nuevos usuarios activos atribuidos a ese periodo/cohorte. Reportar la base y el periodo junto con el resultado; si falta gasto atribuible o conteo, reportar desconocido, no cero. Metas de fuente: MAU 1,000–2,000 y CAC PEN 10 durante los primeros tres meses. Justificación: hace explícito el denominador y evita presentar datos ausentes como resultados. No verificado; no es una regla de pagos ni una política financiera.
- **Q-13, decisión delegada (caso de estudio):** conservar los eventos analíticos de onboarding por 90 días y limitar el reporte a datos sintéticos y agregados. Justificación: acota la retención de la medición del laboratorio. No es política de producción ni de datos reales.
- **Seguridad contra enumeración:** las comprobaciones de existencia de celular/correo en alta y cualquier verificación o recuperación disponible deben responder con el mismo texto y forma observable y con tiempos comparables exista o no la cuenta. No se define ni se agrega un flujo de recuperación a HU-01. La regla no elimina el mensaje de DNI duplicado ya definido por Q-01.

## Dependencias y revisión

La verificación manual en navegadores reales y la comprobación de Compose están planificadas, pero no ejecutadas. HU-01 no depende de Meilisearch. Lag, caída y reindexación de Meilisearch corresponden a cobertura posterior de HU-02, no a este cambio. El punto de entrada de pagos no equivale a autorización para transferir: cualquier ejecución queda pendiente de HU-02/HU-04.

La especificación propone contratos de respuesta y amenazas de enumeración dentro de las rutas autorizadas para este resultado. No genera archivos OpenAPI ni threat-model separados porque esas rutas no están autorizadas en esta tarea.

**Recomendación:** aceptar esta definición documental para revisión humana, con la dependencia de pagos explícita. No se afirma que los checks se hayan ejecutado ni que la medición analítica esté verificada.