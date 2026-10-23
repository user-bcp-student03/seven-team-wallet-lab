---
name: angular-frontend-security
description: "Usar para revisar la seguridad de una aplicación Angular 21 de wallet."
---

# Seguridad Angular

## Procedimiento

1. XSS: buscar `bypassSecurityTrust*`, `innerHTML` y plantillas con contenido
   no confiable (por ejemplo, concepto del pago o nombre de contraparte).
2. Rutas: los guards son solo UX; confirmar que cada endpoint valida en servidor.
3. Formularios: validación en cliente como ayuda; el servidor valida de nuevo.
   Importes como cadena/decimal, sin `number` flotante para dinero.
4. Interceptores HTTP: no registran cuerpos, cabeceras de autorización ni PII.
5. Build: sin secretos en `environment*.ts`; source maps no públicos en producción.
6. Cabeceras de despliegue: CSP, `X-Content-Type-Options`, `frame-ancestors`.
7. Dependencias npm: lockfile presente y revisión de paquetes vulnerables.

## Salida

Hallazgos con archivo, componente afectado, evidencia y prueba de regresión.
