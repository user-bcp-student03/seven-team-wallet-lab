---
name: wallet-access-control
description: "Revisa autenticación y autorización en APIs Spring Boot de wallets. Usar al analizar acceso a saldos, movimientos, transferencias, retiros y funciones administrativas."
---

# Objetivo

Detectar acceso o ejecución de operaciones sin los permisos necesarios,
incluido acceso a recursos de otros usuarios o tenants.

# Procedimiento

1. Identifica endpoints, controladores, servicios y repositorios del flujo.
2. Localiza SecurityFilterChain y los mecanismos de autenticación.
3. Comprueba el comportamiento efectivo de:
   - Endpoints públicos y protegidos.
   - Reglas por método HTTP y ruta.
   - Autorización a nivel de método, si se utiliza.
4. Verifica que la identidad provenga del contexto autenticado y no de
   un userId, ownerId o tenantId enviado por el cliente.
5. Revisa autorización sobre cada recurso:
   - Wallet de origen.
   - Detalles de movimientos y transferencias.
   - Retiros, devoluciones y operaciones administrativas.
6. Si se usan JWT, revisa firma, algoritmo permitido, emisor, audiencia
   y vigencia según la configuración del sistema.
7. Evalúa CORS, CSRF y sesiones según el modelo de autenticación.
   No recomiendes desactivar CSRF sin justificarlo.
8. Busca asignación masiva de campos sensibles desde DTO:
   propietario, rol, estado, saldo o límites de operación.
9. Revisa las pruebas existentes y propone las faltantes.

# Casos mínimos de verificación

- Usuario no autenticado: no accede a recursos protegidos.
- Usuario A: no consulta movimientos privados de B.
- Usuario A: no debita la wallet de B cambiando un identificador.
- Usuario normal: no ejecuta una devolución administrativa.
- Un tenant: no accede a recursos de otro tenant, si aplica.

Una transferencia legítima hacia un destinatario no implica permiso para
consultar sus datos privados ni operar sobre su saldo.

# Evidencia y salida

Relaciona endpoint, identidad, autorización y acceso a datos.
Distingue una vulnerabilidad demostrada de una revisión incompleta.
Entrega los hallazgos con el formato del agente.