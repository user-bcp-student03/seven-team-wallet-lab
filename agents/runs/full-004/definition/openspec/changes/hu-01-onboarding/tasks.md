# Tareas técnicas propuestas — hu-01-onboarding

## Estado y alcance

Propuesta para revisión de PO y Testing. Cubre únicamente HU-01 y conserva los CA originales CA1–CA6. No modifica las fuentes de requisitos, no constituye aprobación de construcción y no acredita ejecución de checks. Los pagos pertenecen a HU-02 y HU-04; la activación de HU-01 no los ejecuta ni habilita. El gate de idempotencia de HU-04 debe superarse antes de habilitar pagos.

Las tareas técnicas usan IDs `1.x`; los escenarios de prueba usan IDs `T-HU01-xx`. Los checks autorizados son `backend-tests`, `frontend-tests` y `openspec`. Compose y navegadores reales no tienen check autorizado en este plan y quedan como validación manual pendiente.

## Decisiones y dependencias

- Q-01 y Q-11: aplicar las decisiones de laboratorio ya registradas para datos, unicidad y credenciales; no reinterpretarlas como políticas de producción.
- Q-02 — **Decisión delegada (caso de estudio), ya registrada:** eventos `onboarding_started`, `onboarding_step_completed` y `onboarding_closed`; 30 minutos de inactividad cierran el flujo como abandono; la mediana usa finalizaciones exitosas desde el primer inicio hasta el cierre exitoso. Justificación registrada: frontera reproducible que no atribuye duración a abandonos. No verificada.
- Q-03 — **Decisión delegada (caso de estudio), ya registrada:** activación equivale a alta completada; conteo de nuevos usuarios activos deduplicado por usuario y mes; CAC = gasto de adquisición atribuido / usuarios nuevos activos atribuidos. Si falta gasto o denominador, informar desconocido, no cero. Justificación registrada: evitar presentar datos ausentes como resultados. No verificada.
- Q-13 — **Decisión delegada (caso de estudio), ya registrada:** retención de eventos analíticos por 90 días y reporte agregado de datos sintéticos. Justificación registrada: acotar la retención del laboratorio. No es política de producción. No verificada.
- HU-01 no depende de Meilisearch. Lag, caída y reindexación corresponden a cobertura posterior de HU-02.
- El borrador de registro presenta una diferencia observable entre alta nueva y colisión de celular/correo. La respuesta genérica por sí sola no elimina diferencias de estado, cuerpo, cookies, sesión o navegación. Resolver y revisar esta tensión con PO/Security antes de construir el alta; no añadir verificación o recuperación fuera del alcance aprobado.

## Tareas

- [ ] 1.1 Implementar el alta del lado servidor solo después de la revisión del contrato de privacidad. Validar en servidor los campos obligatorios y formatos definidos; persistir identidad y activación atómicamente con unicidad de DNI, celular y correo; establecer sesión solo tras el commit. No aceptar identidad/ownership enviados por el cliente ni incluir una operación de pago. Dependencia: revisión PO/Security de la diferencia observable por celular/correo. Evidencia: `backend-tests` con PostgreSQL efímero y `openspec`.
- [ ] 1.2 Implementar el flujo responsive de frontend con secuencia y paso actual visibles, bloqueo ante datos inválidos, mensajes accionables y navegación a Home tras alta exitosa. No presentar transferencias como ejecutables desde HU-01. Dependencia: contrato de alta revisado y handoff de backend. Evidencia automatizada: `frontend-tests` con Vitest/jsdom. Validación manual en Edge, Chrome y Safari: planificada, **NO EJECUTADO**.
- [ ] 1.3 Implementar el registro y los oráculos analíticos de HU-01 según las decisiones delegadas Q-02, Q-03 y Q-13: eventos de inicio, paso completado y cierre; abandono a los 30 minutos; mediana solo de flujos exitosos; conteo mensual deduplicado; fórmula CAC y valor desconocido si faltan datos; retención de 90 días. Usar datos sintéticos y no afirmar resultados de cohortes. Dependencia: tareas 1.1 y revisión de los eventos. Evidencia: `backend-tests` con PostgreSQL efímero y `openspec`.
- [ ] 1.4 Preparar la revisión de plataforma para HU-01: comprobar documentalmente que el flujo no depende de Meilisearch y describir el entorno OCI/Compose objetivo dentro de `orchestration/`, sin arrancar servicios ni activar agentes. La validación Compose queda manual y **NO EJECUTADO**; `openspec` solo aporta evidencia documental. Dependencia: configuración de producto disponible tras el gate humano. Lag, caída y reindexación de Meilisearch se difieren a HU-02.
- [ ] 1.5 Verificar el comportamiento de privacidad de celular/correo en el contrato y en el alta: comparar estado HTTP, cuerpo, cabeceras, cookies/sesión, navegación observable y tiempos para existencia y no existencia; mantener explícita la excepción de mensaje por DNI duplicado definida en la fuente. Añadir escenarios de prueba sin crear endpoints de verificación o recuperación. Dependencia: decisión revisada por PO/Security antes de construir; el mensaje genérico por sí solo no demuestra igualdad observable. Evidencia: `backend-tests` y `openspec`.

## Handoffs estructurados

### 1.1 — Backend: alta y activación

- **Criterios:** CA2, CA3.
- **Escenarios:** `T-HU01-02`: campo obligatorio ausente o formato inválido bloquea el avance y no crea identidad; los errores indican cómo corregir. `T-HU01-03`: registros concurrentes con el mismo DNI, celular o correo crean como máximo una identidad por identificador. `T-HU01-04`: fallo durante persistencia deja cero identidad/wallet/sesión parciales; alta válida activa la wallet y establece sesión solo después del commit. `T-HU01-05`: comprobar ownership entre sesiones solo sobre operaciones autorizadas existentes; derivar identidad de la sesión, no de datos del cliente, y no inventar una ruta de lectura/modificación.
- **Dependencias:** revisión PO/Security de la respuesta observable por colisión de celular/correo; frontend consume el contrato revisado.
- **Rutas:** `backend/`.
- **Evidencia:** `backend-tests` contra PostgreSQL efímero; `openspec` para trazabilidad documental. No ejecutados en este plan.

### 1.2 — Frontend: pasos y navegación

- **Criterios:** CA1, CA2, CA3.
- **Escenarios:** `T-HU01-01`: secuencia requerida y paso actual visibles al avanzar. `T-HU01-02`: campos inválidos bloquean el avance y muestran corrección accionable. `T-HU01-06`: alta exitosa muestra el mensaje definido y Home. Comprobación manual responsive en Edge, Chrome y Safari planificada, **NO EJECUTADO**.
- **Dependencias:** contrato de registro revisado y comportamiento de alta de la tarea 1.1.
- **Rutas:** `frontend/`.
- **Evidencia:** `frontend-tests` con Vitest/jsdom y `openspec`; los tests jsdom no sustituyen la validación manual de navegadores.

### 1.3 — Backend: analítica

- **Criterios:** CA4, CA5, CA6.
- **Escenarios:** `T-HU01-07`: registrar inicio, cada paso completado y cierre. `T-HU01-08`: cierre como abandono tras 30 minutos de inactividad y exclusión de la mediana de éxitos. `T-HU01-09`: calcular la mediana usando inicio y cierre exitoso; contar nuevos usuarios activos una vez por usuario y mes; calcular CAC con la fórmula delegada y reportarlo desconocido cuando falte gasto o denominador. `T-HU01-10`: aplicar retención de 90 días a eventos analíticos sintéticos/agregados. Decisiones delegadas de laboratorio; no verificadas.
- **Dependencias:** eventos del flujo de onboarding disponibles desde la tarea 1.1; utilizar PostgreSQL y no depender de Meilisearch.
- **Rutas:** `backend/`.
- **Evidencia:** `backend-tests` con fixtures sintéticos y PostgreSQL efímero; `openspec`. No ejecutados en este plan.

### 1.4 — Plataforma: entorno y dependencia de búsqueda

- **Criterios:** CA1, CA3, CA4, CA5, CA6.
- **Escenarios:** `T-HU01-11`: confirmar en el diseño que onboarding funciona sin Meilisearch. `T-HU01-12`: documentar el entorno OCI/Compose previsto y sus dependencias para revisión humana; no afirmar arranque, salud ni compatibilidad comprobados. Compose queda **NO EJECUTADO**. Lag, caída y reindexación se remiten a HU-02.
- **Dependencias:** definición de componentes de HU-01 y gate humano; no se activa runner ni se accede a servicios.
- **Rutas:** `orchestration/`.
- **Evidencia:** `openspec` para documentos. No existe check autorizado de Compose en este plan.

### 1.5 — Backend: privacidad del registro

- **Criterios:** CA2, CA3.
- **Escenarios:** `T-HU01-13`: comparar respuestas observables para alta nueva y colisiones de celular/correo, incluyendo estado, cuerpo, cabeceras, cookies/sesión, navegación y tiempos. `T-HU01-14`: verificar que las respuestas de cualquier comprobación de existencia o recuperación disponible no distingan existencia; no añadir endpoints de verificación o recuperación. Revisar por separado el mensaje fuente para DNI duplicado.
- **Dependencias:** revisión PO/Security previa a construir el alta. La igualdad del mensaje sin igualdad observable no satisface el escenario.
- **Rutas:** `backend/`.
- **Evidencia:** `backend-tests` y `openspec`. Sin aplicación ejecutable, no hay resultados de prueba que reportar.

## Preguntas para revisión y límites

- La propuesta de alta debe reconciliar el éxito con sesión/Home y la colisión de celular/correo con respuestas observables comparables. El borrador existente no demuestra esa propiedad; se requiere revisión PO/Security antes de construir el alta.
- El punto de entrada a pagos mencionado en CA3 no habilita transferencias en HU-01. La ejecución financiera queda fuera de este cambio y depende de HU-02 y HU-04, incluida la verificación de idempotencia antes de habilitar pagos.
- Las decisiones Q-02, Q-03 y Q-13 son exclusivamente de laboratorio y no demuestran duración, MAU, CAC ni retención observados.
- No se ejecutaron `backend-tests`, `frontend-tests`, `openspec`, Compose ni pruebas manuales de navegador. Los checks aportarán evidencia posteriormente; esta propuesta no aprueba su propia implementación.