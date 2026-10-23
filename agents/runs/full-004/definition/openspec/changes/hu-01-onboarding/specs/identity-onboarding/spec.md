# Capacidad: onboarding de identidad (delta HU-01)

## Alcance y estado

Delta funcional de HU-01 únicamente. La HU original y sus criterios no se reescriben. HU-02 y HU-04 siguen después de HU-01; HU-03, HU-05 y HU-06 permanecen diferidas. El producto del caso de estudio usa datos y dinero ficticios y no tiene proveedores externos ni simulados.

Estados de decisión: **Confirmado** = fuente o decisión de laboratorio registrada; **Decisión delegada (caso de estudio)** = valor definido solo para el laboratorio, no una política de producción; **Pendiente** = requiere decisión humana y no se completa por inferencia.

## Requisitos y escenarios trazables

### R-HU01-01 — Pasos visibles

**Fuente:** HU-01 CA1; HU-01, Contexto; BUSSINESS_RULES.md, Tecnología y Navegadores. **Estado:** confirmado. La experiencia web responsive presenta la secuencia de pasos requeridos y señala el paso actual mientras el flujo está activo. Debe contemplar Edge, Chrome y Safari.

**T-HU01-01 — Pasos y navegación.** Given que el usuario inicia el onboarding, when avanza entre pasos válidos, then la secuencia requerida y el paso actual permanecen visibles. Evidencia: prueba Vitest/jsdom; validación manual en Edge, Chrome y Safari planificada y marcada NO EJECUTADO.

### R-HU01-02 — Datos y validación de alta

**Fuente:** HU-01 CA2; BUSSINESS_RULES.md, Onboarding Wallet y Consideraciones del Onboarding; decisiones registradas Q-01 y Q-11. **Estado:** confirmado para el alcance del laboratorio. Solicitar tipo de documento DNI, número de documento, celular, correo y contraseña. Aplicar los formatos y límites registrados: DNI de 8 dígitos numéricos; celular de 9 dígitos numéricos; correo con dominio válido; contraseña alfanumérica de 8 a 20 caracteres, conforme a Q-11. No extrapolar estos valores a producción.

**T-HU01-02 — Campos obligatorios y límites.** Given un paso con un campo obligatorio vacío o un valor que incumple su formato o límite, when el usuario intenta continuar, then el avance se bloquea y aparece un mensaje accionable que identifica cómo corregir el dato. Given datos válidos, when el usuario continúa, then el flujo permite el siguiente paso. Evidencia: frontend-tests y backend-tests.

**T-HU01-03 — Unicidad, privacidad y concurrencia.** Given un alta con DNI ya registrado, when se selecciona Registrar, then se muestra `El cliente ya existe`. Given celular o correo existentes o inexistentes, when una comprobación de existencia se realiza en alta o en una verificación/recuperación disponible, then la respuesta observable es la misma para ambos estados y los tiempos son comparables. No se incorpora un flujo de recuperación nuevo. La igualdad de respuesta para celular/correo no reemplaza el mensaje específico de DNI duplicado.

Given dos sesiones intentan registrar simultáneamente el mismo identificador único, when ambas solicitudes se procesan, then como máximo una crea la identidad y la otra recibe el resultado no revelador previsto; no se crean duplicados. Given el alta falla después de comenzar una operación persistente, when la operación revierte, then no queda una identidad parcial. Given una sesión intenta consultar o modificar una identidad perteneciente a otra, when realiza la operación, then no obtiene ni modifica datos ajenos. Evidencia: backend-tests con PostgreSQL efímero; estos son escenarios planificados, no resultados ejecutados.

**Contrato de respuesta propuesto (OpenAPI delta, sin archivo adicional):** las respuestas de comprobación de existencia de celular/correo no incluyen un indicador, código o texto que permita distinguir existencia. Mantienen el mismo cuerpo y forma observable y tiempos comparables para ambos resultados. Las respuestas de éxito de registro y el mensaje de DNI duplicado conservan las fuentes y Q-01. No se prescribe aquí un esquema técnico de endpoint.

**Amenaza considerada:** enumeración de cuentas por celular/correo a través de alta, verificación o recuperación. Mitigación verificable: respuesta no reveladora igual y tiempos comparables; evitar datos personales en telemetría. La protección se aplica a cualquier comprobación disponible, sin añadir recuperación al alcance.

### R-HU01-03 — Activación y resultado de alta

**Fuente:** HU-01 CA3; BUSSINESS_RULES.md, Consideraciones del Onboarding; Q-01; restricción de alcance HU-01 → HU-02 → HU-04. **Estado:** confirmado para alta y Home; ejecución de pagos depende de HU-02/HU-04.

**T-HU01-04 — Alta exitosa y límite de pagos.** Given que los datos obligatorios son válidos y el cliente aún no existe, when el usuario selecciona Registrar y el alta concluye, then el estado de la wallet pasa a activo, se muestra `El cliente fue creado con exito` y aparece Home del Wallet. El criterio original CA3 menciona el punto de entrada de pagos de bajo monto; este cambio no autoriza una transferencia ni declara implementado ese punto. La ejecución de pagos queda fuera de HU-01 y depende de HU-02/HU-04. Given un usuario activo, when intenta iniciar una transferencia antes de completar las historias autorizadas para pagos, then HU-01 no presenta la transferencia como disponible por efecto de su activación. Evidencia: backend-tests y frontend-tests para alta/estado/navegación; cobertura de pagos pendiente de HU-02/HU-04.

### R-HU01-04 — Eventos y duración

**Fuente:** HU-01 CA4–CA5; pregunta original Q-02; HU-01, Preguntas abiertas. **Estado:** Decisión delegada (caso de estudio), no verificada. Eventos: `onboarding_started`, `onboarding_step_completed` y `onboarding_closed`. Un flujo comienza en su primer evento `onboarding_started`; finaliza para duración cuando `onboarding_closed` sigue a la finalización exitosa. A los 30 minutos sin actividad se cierra como abandono y no se incorpora a la mediana de finalización exitosa. Medir la mediana de duración de finalizaciones exitosas por cohorte/periodo. La meta de HU-01 CA5 es reducir la mediana de 8 a 3 minutos durante el trimestre posterior al lanzamiento; esta definición no afirma que se haya alcanzado.

**T-HU01-05 — Oráculo analítico CA4–CA6.** Given un flujo que inicia, completa pasos y termina correctamente, when se emiten sus eventos, then hay un inicio, un evento por paso completado y un cierre, con marcas temporales ordenables. Given un flujo sin actividad durante 30 minutos, when se alcanza ese umbral, then se registra el cierre como abandono y no como finalización exitosa. Given una cohorte de flujos finalizados, when se calcula CA5, then la duración usa inicio y cierre exitoso y la mediana se compara con la referencia de 8 minutos y la meta de 3 minutos para el trimestre posterior al lanzamiento. Evidencia: openspec y pruebas backend planificadas; los valores y oráculos son supuestos delegados no verificados.

### R-HU01-05 — Nuevos usuarios activos, MAU y CAC

**Fuente:** HU-01 CA6 y Contexto; preguntas originales Q-03 y Q-13. **Estado:** Decisión delegada (caso de estudio), no verificada. Para este reporte, activación equivale a alta completada; el conteo mensual de nuevos usuarios activos deduplica por usuario y mes de activación. CAC del periodo/cohorte = gasto de adquisición atribuido a dicho periodo/cohorte / nuevos usuarios activos atribuidos a ese periodo/cohorte. Mostrar periodo, denominador y gasto usado; si falta alguno, informar desconocido. Objetivos originales: MAU 1,000–2,000 y CAC PEN 10 por usuario nuevo en los primeros tres meses. Esta definición de medición no cambia reglas financieras de transferencias ni constituye gasto real.

**Q-13, decisión delegada (caso de estudio):** retención de eventos analíticos de onboarding por 90 días; reporte con datos sintéticos y agregados. No aplica a datos reales ni establece una política de producción.

**T-HU01-06 — Oráculos CA6 y retención.** Given altas completadas en un mes, when se genera el reporte, then se cuenta cada usuario una vez como nuevo usuario activo del mes. Given gasto de adquisición y usuarios atribuidos disponibles, when se calcula CAC, then el resultado usa la fórmula y el periodo declarados; si falta gasto o denominador, then el valor se reporta como desconocido y no como cero. Given eventos analíticos de onboarding, when superan 90 días, then dejan de estar disponibles para el reporte del laboratorio. Evidencia: openspec y pruebas backend planificadas; medición de cohortes, gasto y retención no ejecutada/verificada.

## Matriz HU/CA y evidencia

| HU/CA | Fuente exacta | Requisito | Escenario | Evidencia esperada | Decisión |
| --- | --- | --- | --- | --- | --- |
| HU-01/CA1 | HU-01 CA1; BUSSINESS_RULES.md, Tecnología/Navegadores | R-HU01-01 | T-HU01-01 | frontend-tests; navegadores reales manuales NO EJECUTADO | Confirmado |
| HU-01/CA2 | HU-01 CA2; BUSSINESS_RULES.md, Onboarding Wallet | R-HU01-02 | T-HU01-02, T-HU01-03 | backend-tests + frontend-tests | Q-01/Q-11 registrados; respuesta no enumerativa especificada |
| HU-01/CA3 | HU-01 CA3; BUSSINESS_RULES.md, Consideraciones | R-HU01-03 | T-HU01-04 | backend-tests + frontend-tests; pagos requieren HU-02/HU-04 | Confirmado con dependencia de alcance |
| HU-01/CA4 | HU-01 CA4; Q-02 | R-HU01-04 | T-HU01-05 | openspec; pruebas backend planificadas | Decisión delegada, no verificada |
| HU-01/CA5 | HU-01 CA5; Q-02 | R-HU01-04 | T-HU01-05 | openspec; medición de cohorte futura | Decisión delegada, no verificada |
| HU-01/CA6 | HU-01 CA6; Q-03/Q-13 | R-HU01-05 | T-HU01-06 | openspec; evidencia de datos futura | Decisiones delegadas, no verificadas |

## Supuestos, dependencias y límites

- **Decisión delegada (caso de estudio), Q-02:** eventos, frontera de duración, abandono por 30 minutos y población de mediana están fijados arriba; no verificados.
- **Decisión delegada (caso de estudio), Q-03:** regla de conteo, fórmula y manejo de datos ausentes están fijados arriba; cifras objetivo provienen de HU-01; resultados no verificados.
- **Decisión delegada (caso de estudio), Q-13:** retención analítica de 90 días para datos sintéticos/agregados; no es una política de producción.
- Q-01 y Q-11 se refieren al registro de decisiones de laboratorio proporcionado; no se declaran aprobaciones nuevas.
- HU-01 no depende de Meilisearch. Lag, indisponibilidad y reindexación se cubren, si corresponde, en HU-02, no aquí.
- Vitest/jsdom y checks backend pueden dar evidencia automatizada si se ejecutan; validación manual en Edge, Chrome y Safari y Compose permanecen planificadas y NO EJECUTADAS.
- La ejecución de pagos requiere HU-02 y HU-04. No incluir HU-03/HU-05/HU-06 ni convertir el alta en autorización de pagos.

## Dependencias de tareas y evidencia

Los checks nombrados son los existentes y autorizados: `backend-tests`, `frontend-tests` y `openspec`. Las pruebas son planes, no resultados. Compose y navegadores reales no cuentan con check disponible y quedan como validación manual planificada, NO EJECUTADA. Tareas técnicas usan IDs `1.x`; escenarios usan prefijo `T-HU01-xx` para evitar colisiones.