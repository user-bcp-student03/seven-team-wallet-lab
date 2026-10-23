---
name: database
description: "Use when: diseñar, crear, migrar, probar u operar PostgreSQL para el MVP wallet con un microservicio Java 21 imperativo en Spring Boot, incluido onboarding, saldo, pagos, idempotencia, conciliación y Podman local."
---

# Skill: Database Wallet

## 1) Metadata
- **Skill ID:** wallet-postgresql-database
- **Version:** 1.0.0
- **Purpose:** Guiar el modelado y operación segura de PostgreSQL que soporta las historias del MVP de wallet.
- **Audience (roles):** Backend, Tech Lead, QA, DBA
- **When to use:** Al crear o modificar esquema, migraciones, consultas, transacciones, restricciones, índices, fixtures o configuración PostgreSQL/Podman.
- **When NOT to use:** Para cambios de persistencia fuera del MVP aprobado o cambios de producto sin decisión.
- **Sensitive inputs:** No incluir datos reales, credenciales, secretos, tokens o dumps con información personal.
- **Expected output:** Migraciones reproducibles, esquema probado, comandos locales y evidencia de integridad/concurrencia.

## 2) Inputs
- Épica: `docs/requirements/epic/peru-wallet-mvp.sp.md`.
- Historias activas, en secuencia: HU-01 `docs/requirements/user-stories/user-onboarding-mvp-completion.sp.md`, HU-02 `docs/requirements/user-stories/payer-low-value-payment-confirmation.sp.md` y HU-04 `docs/requirements/user-stories/payment-idempotency-protection.sp.md`.
- Correo, DNI, nombres, celular, login inexistente y rechazo por saldo insuficiente son contexto, no requisitos adicionales: modelarlos o probarlos solo si la SPEC/tarea aprobada los incluye expresamente.
- Esquema, migraciones, herramienta de migración, configuración Podman y contratos existentes.
- Decisiones aprobadas de autenticación, datos, moneda, límites y retención.

## 3) Flujo de diseño e implementación

### Descubrimiento y alcance
1. Inspeccionar esquema, migraciones, motor y convenciones actuales; extender la solución existente y no agregar una herramienta paralela.
2. Usar la épica como marco y limitar el trabajo a las tres historias indicadas y requisitos explícitos. No inferir funcionalidades de otras historias.
3. Tratar las listas de modelado y validación de esta skill como guía, no como criterios nuevos. Implementar solo lo trazado a la SPEC/tarea aprobada. Identificar preguntas abiertas (regla de monto bajo, retención idempotente, estados visibles, KYC y fronteras analíticas) y pedir resolución cuando impidan una migración correcta.

### Modelado e integridad
- Modelar únicamente los datos necesarios para los criterios y tareas aprobados: usuario/onboarding, activación, pagos, idempotencia, auditoría/conciliación y eventos solo cuando correspondan al alcance.
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

### PostgreSQL local con Podman
- Reutilizar `Containerfile`/`Dockerfile`, Compose, tareas y documentación existentes. Configurar PostgreSQL y el microservicio localmente con red/puertos explícitos, volumen de desarrollo, health/readiness checks y espera de disponibilidad de DB.
- Configurar conexión y secretos fuera del control de versiones mediante variables de entorno/configuración local ignorada por Git. Usar credenciales/base solo de desarrollo o pruebas; nunca datos reales.
- Verificar arranque, conexión, migraciones y recuperación tras reinicio. Documentar comandos ejecutados realmente. No borrar volúmenes sin autorización explícita.

## 4) Plan de validación
- Probar restricciones, FK, unicidad y migraciones desde estado vacío y previo.
- Probar onboarding y activación según los criterios aprobados; probar usuario inexistente en login solo si la SPEC/tarea lo incluye.
- Probar saldo insuficiente y concurrencia financiera solo cuando esos comportamientos estén incluidos en criterios aprobados.
- Probar solicitudes idempotentes concurrentes, resultado repetido, payload distinto, auditoría y distinción en conciliación.
- Probar estados asíncronos y persistencia de referencia/historial; las pruebas que dependen de bloqueos, índices o aislamiento deben ejecutarse en PostgreSQL real o Podman, no solo en memoria.
- Revisar planes e índices con consultas reales y verificar cobertura/umbrales existentes sin reducirlos.
- Limitar la corrección a dos ciclos por tarea/check después del intento inicial. Si reaparece el mismo error, detenerse y reportar comando, salida y bloqueo; no repetirlo ni aplicar otra corrección sin una hipótesis nueva, concreta y comprobable. No ampliar el límite sin autorización humana.

## 5) Constraints
- Java 21 con Spring Boot imperativo en el microservicio; PostgreSQL para persistencia y Podman para entorno local, según configuración del repo.
- No introducir Quarkus, WebFlux, Reactor ni persistencia reactiva. No inventar herramienta de migración, credenciales, datos, límites ni política de retención.
- No hacer cambios irreversibles ni operaciones destructivas sin decisión/autorización.
- Outbox u otras estructuras adicionales solo si las requiere la arquitectura aprobada y los criterios.

## 6) Validation Rules
- Toda tabla, restricción e índice se traza a un flujo o criterio aprobado.
- Migraciones son versionadas, reproducibles y probadas sobre PostgreSQL.
- Invariantes de saldo e idempotencia resisten concurrencia y fallos/reintentos.
- Informar estado como `cumplido`, `pendiente de decisión o gate`, `no aplicable` o `falta evidencia`.

## 7) Evidence
- Diagrama o descripción del modelo y trazabilidad a historias.
- Migraciones y resultados de pruebas desde base vacía/previa.
- Evidencia de pruebas de concurrencia, idempotencia y saldo.
- Comandos y resultados reales de PostgreSQL/Podman, riesgos y decisiones pendientes.
