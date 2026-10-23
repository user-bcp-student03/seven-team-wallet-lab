---
name: wallet-postgres-security
description: "Revisa seguridad de PostgreSQL y persistencia Java: inyección SQL, restricciones financieras, privilegios, secretos, conexiones y exposición de datos en wallets."
---

# Objetivo

Detectar vulnerabilidades en el acceso a datos y en los controles
de persistencia que protegen el wallet.

# Procedimiento

1. Identifica JPA, Hibernate, JDBC, consultas nativas y migraciones.
2. Sigue entradas externas hasta las consultas.
   Confirma parametrización; usar un ORM no elimina toda inyección.
3. Revisa ordenación y nombres dinámicos de columnas o tablas.
   Los identificadores dinámicos requieren una lista permitida;
   no se protegen como un parámetro de valor común.
4. Comprueba restricciones según el modelo:
   - NOT NULL, claves foráneas y unicidad.
   - Importes y monedas válidos.
   - Claves de idempotencia.
   - Identificadores únicos de eventos del proveedor.
5. Revisa permisos del rol de ejecución:
   - Sin superusuario ni creación de roles.
   - Sin propiedad o permisos de esquema innecesarios.
   - Separación del rol de migraciones cuando corresponda.
6. Comprueba cómo se entregan las credenciales y se verifica TLS,
   incluida la identidad del servidor cuando aplique.
7. Revisa errores, logs, auditoría y respuestas:
   - Sin contraseñas, tokens ni claves.
   - Sin datos personales o financieros innecesarios.
   - Sin detalles internos de SQL expuestos al cliente.
8. Si el sistema es multitenant, verifica aislamiento en todas las rutas.
   Evalúa RLS si existe o si la política la exige; su ausencia por sí sola
   no demuestra una vulnerabilidad.
9. Revisa evidencia de respaldo y restauración disponible.
   No afirmes que funcionan solo porque están configurados.

# Casos mínimos de verificación

- Entradas especiales se tratan como datos, no como SQL.
- Una restricción impide duplicar una clave de idempotencia en su alcance.
- El rol de aplicación no puede modificar el esquema.
- Un error de persistencia no revela credenciales ni consultas sensibles.
- Un tenant no puede leer datos de otro, si aplica.

# Evidencia y salida

Relaciona consulta, entrada, rol y restricción relevante.
La ausencia de configuración en el repositorio es una limitación,
no prueba de que el entorno carezca del control.
Entrega los hallazgos con el formato del agente.