# Revisión del plan de tareas — HU-01 onboarding

## Dictamen

**changes_required.** El plan conserva el alcance HU-01 y propone checks existentes, pero no está listo para revisión de aceptación: los IDs de escenarios de las tareas no concuerdan con los de `specs/identity-onboarding/spec.md` y `testing/coverage.md`; algunos escenarios carecen de una operación/oráculo verificable; y el contrato de registro sigue documentando respuestas distintas para existencia y no existencia de celular/correo. No se ejecutaron checks, pruebas ni validaciones manuales. Este dictamen no es aprobación de producto ni de construcción.

## Checklist OpenSpec

| Revisión | Resultado | Observación |
| --- | --- | --- |
| Alcance e historias | Conforme con observación | Las tareas se limitan a HU-01 y conservan CA1–CA6. Pagos e idempotencia financiera pertenecen a HU-02/HU-04. |
| HU/CA por tarea | Parcial | 1.1–1.5 declaran criterios, pero 1.4 lista CA1, CA3–CA6 sin escenarios que prueben directamente esos criterios. Ajustar la trazabilidad a lo que efectivamente verifica cada tarea. |
| IDs de tareas frente a casos | No conforme | Las tareas OpenSpec 1.1–1.5 no deben confundirse con IDs de prueba; sin embargo, sus IDs T-HU01-xx no coinciden con los escenarios de la spec/cobertura. Normalizar referencias sin crear otro backlog. |
| Escenarios y resultados observables | Parcial | Hay escenarios de concurrencia y rollback, pero ownership entre sesiones y verificación/recuperación no tienen una operación HU-01 definida. No inventar rutas. |
| Dependencias, rutas y evidencia | Parcial | Las tareas nombran rutas y checks, pero algunas dependencias no apuntan a un entregable verificable; 1.5 debe reflejar la revisión del contrato/diseño, no solo una comparación futura en backend. |
| Privacidad y seguridad | No conforme | El borrador OpenAPI diferencia 201 para alta nueva y 422 para colisión de celular/correo. El texto genérico no elimina la diferencia observable. Comparabilidad temporal tampoco tiene método ni criterio acordados. |
| Concurrencia y recuperación | Parcial | 1.1 propone carreras de unicidad y rollback con PostgreSQL efímero. Falta cerrar la superficie de ownership y relacionar los casos con IDs consistentes. |
| Analítica CA4–CA6 | Parcial | 1.3 menciona eventos, 30 minutos, mediana, MAU/CAC y 90 días como decisiones de laboratorio no verificadas. Normalizar IDs y oráculos con la spec/cobertura; no son resultados observados. |
| Contenedores y checks | Parcial | `backend-tests`, `frontend-tests` y `openspec` son checks existentes; el contexto indica que se ejecutan en imágenes de checks. No se aportó evidencia de ejecución en esta revisión. `openspec` no demuestra Compose ni comportamiento runtime. |
| Meilisearch | Conforme con límite de alcance | HU-01 debe probarse sin dependencia de Meilisearch. Lag, caída y reindexación son escenarios futuros de HU-02, no tareas de HU-01. No se afirma que Meilisearch se haya probado. |
| Pagos | Conforme | HU-01 no ejecuta ni habilita pagos. Mantener el gate hasta HU-02/HU-04 y verificación de idempotencia con PostgreSQL; no atribuir esas pruebas a HU-01. |
| Estado de tareas y evidencia | Conforme | Las tareas siguen propuestas y sin completar. No hay evidencia ejecutada suministrada. |

## Cobertura y trazabilidad por criterio

| Criterio | Tarea propuesta | Revisión |
| --- | --- | --- |
| CA1 | 1.2; 1.4 | 1.2 cubre UI/jsdom; navegador real queda como validación manual no ejecutada. 1.4 no debe reclamar CA1 mediante documentación de plataforma. |
| CA2 | 1.1; 1.2; 1.5 | Validación y unicidad están planificadas. Resolver la discrepancia observable del registro y el formato de correo antes de fijar oráculos. |
| CA3 | 1.1; 1.2; 1.5 | Alta/Home está contemplada, pero no queda definido cómo satisfacer el acceso al punto de entrada de pagos sin presentar una transferencia como ejecutable antes de HU-02/HU-04. |
| CA4 | 1.3 | Eventos propuestos; alinear IDs y verificar inicio, cada paso y cierre mediante el check backend cuando haya implementación. |
| CA5 | 1.3 | Mediana y abandono de 30 minutos son decisiones delegadas de laboratorio no verificadas; no afirmar logro de la meta. |
| CA6 | 1.3 | Conteos y fórmula CAC son decisiones delegadas no verificadas; mantener las metas como objetivos y reportar datos ausentes según la decisión registrada. |

## Hallazgos y bloqueos por tarea

| Tarea | Estado de revisión | Hallazgo que debe corregirse |
| --- | --- | --- |
| 1.1 — backend, CA2/CA3 | Cambios requeridos | La concurrencia de DNI/celular/correo y rollback con PostgreSQL son escenarios pertinentes. Alinear T-HU01-02/03/04/05 con los IDs existentes de spec/cobertura. El ownership entre sesiones no es ejecutable sin una operación HU-01 definida: registrar la pregunta y no inventar endpoint. Precisar dependencia del contrato de alta revisado. |
| 1.2 — frontend, CA1/CA2/CA3 | Cambios requeridos | Separar Vitest/jsdom del resultado manual en Edge, Chrome y Safari (`NO EJECUTADO`). Alinear los IDs usados: la tarea refiere T-HU01-06 para Home, mientras la spec/cobertura asignan otros IDs. Precisar cómo se verifica el punto de entrada de pagos sin ejecutar pagos ni contradecir CA3. |
| 1.3 — backend, CA4/CA5/CA6 | Cambios requeridos | Los oráculos enumerados son trazables en concepto, pero T-HU01-07–10 no concuerda con la spec/cobertura. Normalizar IDs y desglosar eventos, abandono/mediana y reporte MAU/CAC/retención con sus resultados esperados y evidencia PostgreSQL. Mantenerlos como supuestos de laboratorio no verificados. |
| 1.4 — plataforma | Cambios requeridos | La evidencia propuesta es `openspec`, que solo valida documentos; no acredita Compose. Mantener Compose como validación humana pendiente y no marcarlo ejecutado. Limitar los criterios vinculados a escenarios realmente comprobados. La independencia de HU-01 respecto a Meilisearch puede documentarse/probarse con el stack HU-01; lag, caída y reindexación quedan para cobertura HU-02. |
| 1.5 — backend, privacidad | Cambios requeridos | El contrato OpenAPI actual distingue alta nueva (201 con sesión/Home) de colisión celular/correo (422); sigue sin cumplir igualdad observable. Revisar y alinear spec/OpenAPI/threat-model antes de construir. Definir método y criterio para «tiempos comparables»; no inventar umbral. T-HU01-14 menciona verificación/recuperación aunque no hay endpoints en HU-01; mantenerlo como pregunta o cobertura condicionada, no como caso ejecutable actual. |

## Preguntas que bloquean el oráculo o la construcción afectada

- **Tarea 1.5 / CA2–CA3:** ¿Cómo se resolverá la diferencia de status, cuerpo, cabeceras, sesión/cookie y navegación entre alta nueva y colisión de celular/correo, preservando los mensajes fuente aplicables? El OpenAPI y la revisión Security todavía describen la diferencia; no declarar mitigación por usar un mensaje genérico.
- **Tarea 1.5:** ¿Qué método y tolerancia aprobados determinan que los tiempos son comparables? No se fijó un criterio estadístico verificable.
- **Tarea 1.1 / ownership:** ¿Qué operación HU-01 permite comprobar acceso cruzado entre sesiones? No inventar una ruta ni declarar ownership verificado sin superficie ejecutable.
- **Tareas 1.1–1.2 / CA2:** La regla de negocio combina correo alfanumérico «sin caracteres especiales» con dominio válido. ¿Qué formato aprobado rige el oráculo? No inferir una regla nueva.
- **Tarea 1.2 / CA3:** ¿Qué significa poder acceder al punto de entrada de pagos sin habilitar transferencias desde HU-01? El plan no debe sustituir el criterio por «pagos no disponibles» sin aclarar la diferencia.

Estas preguntas requieren resolución antes de fijar los oráculos afectados; no representan autorización para ampliar a otras HU, usar datos reales, activar pagos ni construir la wallet.

## Plan de verificación propuesto

1. Normalizar los IDs T-HU01-xx entre tareas OpenSpec, spec y `testing/coverage.md`; conservar 1.1–1.5 como IDs de tareas. Confirmar para cada tarea HU/CA, escenario, dependencia, ruta, check y evidencia esperada.
2. Tras revisión humana y autorización aplicable, ejecutar `backend-tests` en su contenedor con PostgreSQL efímero para validación servidor, unicidad concurrente, rollback y analítica sintética. Ejecutar `frontend-tests` en su contenedor para casos Vitest/jsdom de pasos, validación y Home. Registrar comandos y resultados reales; no declarar aprobación por el plan.
3. Ejecutar `openspec` solo como verificación documental. No usarlo como evidencia de arranque Compose, compatibilidad de navegador, propiedad de seguridad ni comportamiento runtime.
4. Mantener la validación manual Edge/Chrome/Safari y Compose como `NO EJECUTADO` hasta disponer de ambiente y herramientas autorizados. No atribuir resultados a esta revisión.
5. Para HU-01, verificar que el onboarding no requiere Meilisearch. Registrar lag, caída y reindexación como cobertura posterior de HU-02, con su propio alcance y evidencia; no incorporarlos como aceptación de HU-01.
6. Mantener deshabilitados los pagos hasta implementar HU-02/HU-04 y verificar idempotencia, concurrencia, replay/conflicto y recuperación con PostgreSQL. Ninguna de esas verificaciones se declara ejecutada aquí.

## Resultado de evidencia

No se ejecutó ningún check, prueba manual, prueba en navegador, Compose ni escenario de Meilisearch. No se recibió evidencia de runtime. Los escenarios y resultados esperados descritos son planificación para revisión humana, no aceptación ni finalización de tareas.