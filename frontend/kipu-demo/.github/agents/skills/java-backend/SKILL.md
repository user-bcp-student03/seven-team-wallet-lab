---
name: java-backend
description: "Use when: implementar o revisar con Java 21 imperativo y Spring Boot el microservicio backend del MVP wallet, sus flujos de onboarding, pagos, idempotencia, integración con mocks, pruebas o despliegue local con PostgreSQL y Podman."
---

# Skill: Backend Wallet

## 1) Metadata
- **Skill ID:** backend-wallet-implementation
- **Version:** 1.0.0
- **Purpose:** Guiar la implementación backend auditable del MVP de wallet, preservando historias, criterios de aceptación y controles financieros.
- **Audience (roles):** Backend, Tech Lead, QA, Cyber
- **When to use:** Para implementar o validar cambios backend aprobados del MVP.
- **When NOT to use:** Para cambios de frontend, incidentes P1 o cambios fuera de las historias objetivo.
- **Sensitive inputs:** No incluir datos reales de clientes, credenciales, secretos, tokens ni información financiera real.
- **Expected output:** Implementación Java 21 con Spring Boot imperativo, pruebas ejecutadas, evidencia por criterio, estado de gates y riesgos pendientes.

## 2) Inputs
- Issue aprobado y rama autorizada.
- Épica: `docs/requirements/epic/peru-wallet-mvp.sp.md`.
- Historias activas, en secuencia: HU-01 `docs/requirements/user-stories/user-onboarding-mvp-completion.sp.md`, HU-02 `docs/requirements/user-stories/payer-low-value-payment-confirmation.sp.md` y HU-04 `docs/requirements/user-stories/payment-idempotency-protection.sp.md`.
- Código, convenciones, pruebas, configuración de Podman y contrato `contrato.json` existentes.
- Decisiones aprobadas de producto, arquitectura, autenticación y Definition of Done.

## 3) Flujo de implementación

### Alcance y decisiones
- Usa la épica como marco y trabaja únicamente los criterios incluidos en las tres historias activas y en la tarea/SPEC aprobada. Las listas de comportamientos y pruebas de esta skill son guías, no requisitos adicionales: implementa cada elemento solo si está trazado a esos criterios. No agregues historias ni deuda secundaria.
- Antes de implementar, revisa los límites y estándares backend disponibles (por ejemplo, `backend/README.md` si existe), el contrato aplicable, el issue/spec aprobado, las tareas OpenSpec autorizadas si el repositorio las utiliza y las herramientas disponibles. Si falta aprobación, acceso o una herramienta necesaria, no inventes el estado ni implementes a ciegas: entrega una propuesta con el bloqueo y evidencia requerida.
- Genera y mantén `swagger.json` como contrato OpenAPI de la API propia: define allí los servicios/endpoints que se expondrán, sus operaciones, parámetros, esquemas y respuestas. Derívalo del issue/spec aprobado; no agregues endpoints ni cambies contratos sin aprobación. Distingue este contrato del `contrato.json` del mock externo.
- Define en `swagger.json` errores consistentes para el frontend, con estado HTTP, código estable y mensaje seguro y accionable. Mapea errores de validación, negocio y autenticación sin exponer stack traces, SQL, secretos, PII ni detalles internos; no reveles si una cuenta o usuario existe. Incluye datos de correlación solo si el contrato aprobado lo requiere.
- Cumple todos los criterios de aceptación. Registra preguntas abiertas que bloqueen el trabajo (regla de bajo monto, retención de idempotencia, estados visibles, KYC o fronteras analíticas); no inventes sus respuestas.
- Separa los objetivos de negocio posteriores al lanzamiento de los gates técnicos: instrumentar conversión, tiempo de onboarding, MAU y CAC no demuestra que se hayan alcanzado.

### Perfil técnico y comportamiento
- Implementa el API con Java 21 y Spring Boot en estilo imperativo, PostgreSQL y Podman. Usa el estilo MVC imperativo del proyecto; no introduzcas Quarkus, WebFlux, Reactor, `Mono`/`Flux` ni otros flujos reactivos.
- Usa Maven para gestionar la compilación y dependencias del API; respeta el `pom.xml` y el Maven Wrapper existentes si los hay. No migres a Gradle ni agregues plugins sin aprobación.
- Separa dominio sin dependencias de Spring/JPA, aplicación y adaptadores en la medida adecuada al repositorio. Valida entradas en el servidor; la validación del frontend no sustituye controles backend.
- Autentica mediante el mecanismo AUTH aprobado y autoriza cada operación y recurso en el servidor, comprobando ownership cuando corresponda, aplicando mínimo privilegio y denegando por defecto. No confíes en roles o permisos enviados por el frontend ni inventes proveedor, protocolo, roles o claims.
- Aplica Clean Code y SOLID; utiliza patrones cuando reduzcan complejidad real. No inventes credenciales ni guardes secretos.
- Onboarding: capturar únicamente los datos requeridos por la SPEC aprobada; validar entradas y devolver errores estructurados y accionables; exponer secuencia/paso actual para que el frontend los presente; activar wallet y emitir eventos solo según criterios aprobados. No implementar la presentación visual.
- Login: aplicar el comportamiento para usuario inexistente solo si está incluido en la SPEC/tarea aprobada; en ese caso, devolver un error de autenticación controlado sin revelar información sensible.
- Pago: exponer destino y monto para que el frontend los muestre si el flujo de confirmación lo requiere; verificar saldo y rechazar saldo insuficiente solo cuando ese control esté definido en los criterios aprobados; persistir referencia, historial, resultado terminal y siguiente paso permitido conforme a la SPEC. No implementar la pantalla ni sus mensajes visuales.
- Idempotencia: construir la clave según pagador, monto, destino y ventana acordada; una repetición equivalente devuelve el resultado original sin otro pago/débito; auditar request y correlación y distinguir duplicados en conciliación. No inventar retención.
- Ejecutar reintentos ante estados inciertos consultando/resolviendo el intento original; no crear un nuevo cobro para aclarar un timeout.

### Transacciones y proyecciones
- Confirmar movimiento financiero, cambio de estado y asientos requeridos en una misma transacción PostgreSQL. No realizar llamadas a proveedores, servicios externos ni escrituras de índices de búsqueda dentro de la transacción financiera.
- Si un evento aprobado debe publicarse de forma confiable, persistir su outbox atómicamente con el cambio de dominio y publicar después del commit; introducir outbox solo cuando lo justifiquen el contrato y la arquitectura existentes.
- Para historial y búsquedas por referencia, conservar la consulta SQL autoritativa y comprobar ownership/autorización en cada lectura. No añadir Meilisearch ni otro índice por inferencia.
- Solo si una arquitectura aprobada incorpora un índice/proyección de búsqueda, proyectar con ID estable y control de orden/versión; avanzar el checkpoint únicamente tras confirmar la indexación. Diseñar reintento y reconstrucción sin afectar la fuente SQL ni duplicar movimientos financieros.

### Evaluación del mock
- Antes de usar `contrato.json`, mapear cada criterio relevante y clasificar soporte como completo, parcial o ausente. Si no cubre completamente el comportamiento, no usarlo para implementar, validar ni declarar ese criterio cumplido: implementar y probar la regla en nuestro microservicio/PostgreSQL. El mock es opcional y solo simula interacciones externas que represente fielmente.
- Para KYC simulado se dispone de `POST /kyc/verifications`, `GET /kyc/verifications/{id}` y `POST /kyc/verifications/{id}/decision`. Solo admite `documentType: TEST` y documentos `TEST-...`; no reemplaza los datos de onboarding.
- Para pagos se dispone de `POST /payments`, `GET /payments/{id}`, `GET /wallets/{id}` e historial; el mock usa `amountCents`, `PEN`, destinatarios de prueba y escenarios de proveedor. Permite callbacks, estados pendientes y consultas de resolución; el timeout posterior al procesamiento devuelve `paymentId` y no debe causar un segundo cobro.
- QR puede probarse con `POST /qrs`, `POST /qrs/resolve` y `POST /payments` con `qrId` solo si forma parte del issue aprobado. El mock se limita a `merchant-demo` y no valida EMVCo.
- La idempotencia del mock es por wallet y no define la composición completa ni retención de la historia. No la consideres cobertura suficiente de esos criterios. `/ledger`, `/settlements` y `/reconciliations` apoyan pruebas de conciliación; `/control/*` solo es control del simulador, nunca API de negocio.
- Configurar URL base por entorno; no hardcodear el Grupo 7. El servidor es público, sin autenticación definida, y tiene estado remoto persistente compartido. Enviar solo datos sintéticos. No invocar `/control/reset` sin autorización explícita.

## 4) Plan de validación
- Crear pruebas unitarias para toda lógica nueva/modificada y pruebas de integración/contrato de los flujos. Cada criterio debe mapear a evidencia de prueba; cubrir éxito, errores, límites y concurrencia pertinentes.
- Validar que `swagger.json` sea un contrato OpenAPI válido y que los endpoints implementados coincidan con sus operaciones y esquemas aprobados; reportar cualquier diferencia como pendiente, no como criterio cumplido.
- Cubrir los escenarios trazados a criterios aprobados. Onboarding inválido/completo, usuario inexistente, saldo insuficiente, concurrencia, duplicados, estados terminales, timeout, historial y eventos son aplicables solo cuando la SPEC/tarea los incluya.
- Probar semánticas de persistencia contra PostgreSQL real o Podman cuando sean relevantes; no depender solo de una base en memoria.
- Ejecutar pruebas en contenedores contra PostgreSQL real para dominio, límites, concurrencia y fallos de persistencia cuando apliquen. Si existe una proyección/índice aprobado, probar también fallo de indexación, reintento y reconstrucción; si no existe, marcar esos escenarios como no aplicables.
- Revisar cobertura y respetar el umbral del proyecto. Declarar las partes nuevas no cubiertas; no inventar resultados ni reducir el umbral.
- Limitar la corrección a dos ciclos por tarea/check después del intento inicial. Si reaparece el mismo error, detenerse y reportar comando, salida y bloqueo; no repetirlo ni aplicar otra corrección sin una hipótesis nueva, concreta y comprobable. No ampliar el límite sin autorización humana.
- Levantar PostgreSQL y microservicio localmente con Podman, health/readiness checks y migraciones. Usar secretos por configuración local externa, nunca versionados.

## 5) Constraints
- No cambiar contratos sin aprobación, desactivar gates, usar datos reales ni hacer merge por cuenta propia.
- Mantener fuera del PR problemas secundarios y registrarlos como candidatos con evidencia e impacto.
- No exponer PII, credenciales, secretos o información financiera en logs y errores.
- No afirmar que un escenario remoto o una métrica de negocio se verificó sin evidencia.

## 6) Validation Rules
- Todos los criterios de aceptación están trazados a cambios y evidencia de pruebas.
- Las pruebas de lógica propia no dependen del estado compartido remoto del mock.
- Los gates y la cobertura se reportan con resultados reales.
- El cierre separa `cumplido`, `pendiente de otro gate`, `no aplicable` y `falta evidencia`.

## 7) Evidence
- Resumen del cambio y criterios atendidos.
- Comandos y resultados reales de pruebas, cobertura, migraciones y ejecución Podman.
- Mapeo de criterios al mock y brechas implementadas localmente.
- Decisiones abiertas, riesgos residuales y gates pendientes.
- Por tarea: HU/criterio de aceptación, escenario validado, archivos afectados, cambios propuestos o aplicados y comandos realmente ejecutados con sus resultados. No afirmar builds, herramientas ni implementaciones existentes sin evidencia.
