---
name: wallet-session-token-security
description: "Usar para revisar sesión, tokens y CSRF entre Angular y la API."
---

# Sesión y tokens

## Procedimiento

1. Los tokens no se guardan en `localStorage`/`sessionStorage`; preferir cookie
   `HttpOnly; Secure; SameSite` (patrón BFF) según el diseño aprobado.
2. Con cookies, verificar protección CSRF en operaciones que cambian estado.
3. Expiración, renovación y cierre de sesión invalidan el lado servidor.
4. Validación de `iss`, `aud`, firma y expiración del token en la API.
5. CORS restringido a orígenes explícitos; sin `*` con credenciales.
6. Autorización por objeto (ownership) en cada recurso, no solo por rol.

## Salida

Flujo revisado, controles presentes/ausentes, evidencia y pruebas faltantes.
