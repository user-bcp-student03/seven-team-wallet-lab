---
name: database
description: "Use when: diseñar, crear, migrar, probar u operar H2 para el MVP wallet con un microservicio Java 21 imperativo en Spring Boot, incluido onboarding, saldo, pagos, idempotencia y conciliación."
---

# Skill: Database Wallet

## 1) Metadata
- **Skill ID:** wallet-h2-database
- **Version:** 1.0.0
- **Purpose:** Guiar el modelado y operación segura de H2 que soporta las historias del MVP de wallet.
- **Audience (roles):** Backend, Tech Lead, QA, DBA
- **When to use:** Al crear o modificar esquema, migraciones, consultas, transacciones, restricciones, índices, fixtures o configuración H2.
- **When NOT to use:** Para cambios de persistencia fuera del MVP aprobado o cambios de producto sin decisión.
- **Sensitive inputs:** No incluir datos reales, credenciales, secretos, tokens o dumps con información personal.
- **Expected output:** Migraciones reproducibles, esquema probado, comandos locales y evidencia de integridad/concurrencia.

## 2) Inputs
- Épica: `.github/epic/peru-wallet-mvp.sp.md`.
- Historias objetivo: onboarding, confirmación de pago de bajo monto e idempotencia en `.github/user-stories/`.
- Requisitos explícitos del prompt: correo, DNI, nombres, celular; error controlado para login inexistente; pago rechazado si el saldo es insuficiente.
- Esquema, migraciones, herramienta de migración, configuración H2 y contratos existentes.
- Decisiones aprobadas de autenticación, datos, moneda, límites y retención.

## 3) Flujo de diseño e implementación

### Descubrimiento y alcance
1. Inspeccionar esquema, migraciones, motor y convenciones actuales; extender la solución existente y no agregar una herramienta paralela.
2. Usar la épica como marco y limitar el trabajo a las tres historias indicadas y requisitos explícitos. No inferir funcionalidades de otras historias.
3. Identificar preguntas abiertas (regla de monto bajo, retención idempotente, estados visibles, KYC y fronteras analíticas); pedir resolución cuando impidan una migración correcta.

### Modelado e integridad
- Modelar solo los datos necesarios de usuario/onboarding, progreso y activación de wallet, saldo disponible, pagos/estados, clave y resultado de idempotencia, auditoría/conciliación y eventos analíticos requeridos.
- Guardar correo, DNI, nombres y teléfono minimizando su exposición; limitar acceso y aplicar las políticas de cifrado aprobadas. No incluir PII, credenciales o datos financieros en logs, errores o fixtures compartidos.
- Usar PK estables, FK, `NOT NULL`, `UNIQUE` y `CHECK` para invariantes aplicables. Indexar consultas observadas, sin índices redundantes.
- Persistir montos como unidades exactas en céntimos de PEN (entero con rango suficiente, alineado al contrato `amountCents`), nunca coma flotante; validar moneda, rango y precisión conforme a decisiones aprobadas.
- Representar estados permitidos y transiciones de forma que pendiente no sea éxito y exista un único estado terminal por intento. Preservar el historial auditable; no borrar ni alterar evidencia de pagos.
- Validar saldo y registrar débito de forma atómica, con estrategia segura ante concurrencia (bloqueo o débito condicional comprobando filas afectadas). Saldo insuficiente no debe dejar débito ni pago exitoso.

### Idempotencia, onboarding y eventos
- Persistir clave idempotente, su ámbito, huella del request, referencia, estado y resultado original necesarios para responder repeticiones, además de timestamps y correlación. Imponer unicidad en base de datos; no confiar en una consulta previa susceptible a carrera.
- Una misma clave/request recupera el resultado original; payload distinto se rechaza de forma auditable. Conciliación debe distinguir original, duplicado, estado y referencia.
- No fijar ni purgar según una retención inventada; aplicar la política aprobada y bloquear la decisión si hace falta.
- Persistir pasos de onboarding, wallet activa al finalizar y eventos de inicio/progreso/cierre. Registrar eventos con IDs, tipo, timestamp, correlación y referencia seudonimizada cuando sea posible; publicar de manera confiable según arquitectura existente.
- Habilitar los reportes requeridos de nuevos usuarios activos, activación y atribución de adquisición sin inventar ventanas temporales, definiciones de CAC/MAU ni fronteras de funnel.

### Migraciones
- Usar la herramienta ya adoptada. Versionar cambios reproducibles, revisables y no destructivos; nunca depender de alteraciones manuales no registradas.
- Probar creación desde base vacía y actualización desde la versión previa relevante. No editar migraciones aplicadas a entornos compartidos: agregar una correctiva.
- Usar datos sintéticos deterministas. Evaluar compatibilidad, bloqueos e impacto de índices/backfills antes de migrar tablas grandes.

### H2 local
- Configurar H2 explícitamente por perfil, eligiendo modo en memoria o archivo según el uso. Para persistencia local entre reinicios, mantener el archivo de base de datos fuera del control de versiones; no asumir que el modo en memoria ofrece recuperación tras reinicio.
- Reutilizar las convenciones y herramientas de migración existentes. No agregar infraestructura de contenedores para la base H2 embebida.
- Mantener archivos de base de datos y configuración sensible fuera del control de versiones. Usar exclusivamente datos sintéticos; nunca datos reales.
- Verificar arranque, conexión, migraciones y, si se usa modo archivo, recuperación tras reinicio. Documentar comandos ejecutados realmente; no borrar archivos de base de datos sin autorización explícita.

## 4) Plan de validación
- Probar restricciones, FK, unicidad y migraciones desde estado vacío y previo.
- Probar onboarding inválido/completo, activación de wallet, usuario inexistente en login y ausencia de datos sensibles en eventos/logs.
- Probar saldo insuficiente y pagos concurrentes sin sobregiro ni débito indebido.
- Probar solicitudes idempotentes concurrentes, resultado repetido, payload distinto, auditoría y distinción en conciliación.
- Probar estados asíncronos, persistencia de referencia/historial y concurrencia contra el modo H2 configurado. Registrar límites o diferencias del motor; estas pruebas no acreditan el comportamiento de PostgreSQL ni de otro motor.
- Revisar planes e índices con consultas reales y verificar cobertura/umbrales existentes sin reducirlos.

## 5) Constraints
- Java 21 con Spring Boot imperativo y H2 para persistencia. Configurar el modo H2 y la ubicación de archivos por entorno; no introducir Quarkus, WebFlux, Reactor ni persistencia reactiva.
- No inventar herramienta de migración, credenciales, datos, límites ni política de retención.
- No hacer cambios irreversibles ni operaciones destructivas sin decisión/autorización.
- Outbox u otras estructuras adicionales solo si las requiere la arquitectura aprobada y los criterios.

## 6) Validation Rules
- Toda tabla, restricción e índice se traza a un flujo o criterio aprobado.
- Migraciones son versionadas, reproducibles y probadas sobre H2.
- No afirmar compatibilidad con PostgreSQL ni equivalencia de aislamiento, bloqueos, SQL o rendimiento basándose únicamente en pruebas H2. Una futura adopción de otro motor requiere validación específica.
- Invariantes de saldo e idempotencia resisten concurrencia y fallos/reintentos.
- Informar estado como `cumplido`, `pendiente de decisión o gate`, `no aplicable` o `falta evidencia`.

## 7) Evidence
- Diagrama o descripción del modelo y trazabilidad a historias.
- Migraciones y resultados de pruebas desde base vacía/previa.
- Evidencia de pruebas de concurrencia, idempotencia y saldo.
- Comandos y resultados reales de H2, incluyendo el modo de ejecución usado, riesgos y decisiones pendientes.
