---
name: wallet-payment-integrity
description: "Analiza vulnerabilidades de lógica financiera en wallets: doble gasto, concurrencia, idempotencia, precisión monetaria, ledger, webhooks y atomicidad en Spring Boot y PostgreSQL."
---

# Objetivo

Detectar errores que permitan crear, duplicar, perder o mover fondos
sin cumplir las reglas financieras del sistema.

# Procedimiento

1. Identifica el modelo de dinero, saldo, ledger y estados de operación.
2. Establece las invariantes definidas por el proyecto:
   - Importes válidos, moneda y escala permitidas.
   - Sobregiro solo cuando está expresamente permitido.
   - Movimientos balanceados según el modelo contable.
   - Una operación lógica no se procesa dos veces.
3. Comprueba el uso de BigDecimal o unidades menores enteras.
   Revisa precisión, escala y redondeo; evita float/double para dinero.
4. Sigue débito, crédito, ledger y estado hasta sus escrituras reales.
   Verifica el límite transaccional efectivo y el rollback.
5. Revisa concurrencia:
   - Una consulta de saldo seguida de una resta no es suficiente.
   - Comprueba bloqueo, actualización condicional o control de versiones.
   - Verifica manejo de conflictos, deadlocks y reintentos.
6. Analiza idempotencia:
   - Alcance de la clave por actor y tipo de operación.
   - Unicidad persistida en la base de datos.
   - Asociación con el contenido de la solicitud.
   - Comportamiento ante solicitudes simultáneas y reintentos.
   - Misma clave con distinto contenido: rechazo explícito.
7. Si existen webhooks:
   - Verifica autenticidad antes de modificar estados.
   - Comprueba detección de eventos repetidos.
   - Revisa eventos fuera de orden y transiciones permitidas.
   - No confíes en una confirmación enviada solo por el cliente.
8. Si interviene un proveedor externo, revisa fallos parciales.
   No asumas que una transacción de PostgreSQL revierte una llamada HTTP.
   Evalúa recuperación, conciliación y mecanismos existentes.

# Casos mínimos de verificación

- Saldo 100: dos débitos concurrentes de 80 no pueden aprobarse ambos
  si el sobregiro está prohibido.
- Dos peticiones equivalentes con la misma clave crean una sola operación.
- Misma clave con otro importe produce un conflicto.
- Fallo entre débito y crédito no deja una transferencia local parcial.
- Un webhook repetido no acredita fondos por segunda vez.
- Importe negativo, cero o con escala inválida respeta las reglas definidas.

# Evidencia y salida

Indica las escrituras y restricciones que protegen cada invariante.
No presentes @Transactional como garantía sin revisar su aplicación efectiva.
Entrega los hallazgos con el formato del agente.