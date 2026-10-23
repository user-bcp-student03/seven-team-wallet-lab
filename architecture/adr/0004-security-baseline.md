# ADR-0004: Seguridad verificable sin afirmar certificacion

- Fecha: 2026-10-23
- Estado: Propuesto.
- Referencias activas: HU-01, HU-02, HU-04; Q-01, Q-11, Q-13, Q-17.

## Contexto

Se requieren practicas de aplicaciones bancarias, pero el proyecto es un
laboratorio sin fondos reales ni habilitacion regulatoria.

## Decision

Usar OWASP ASVS nivel 2 como base de verificacion y evaluar controles de nivel 3
segun amenazas de pago y acceso privilegiado. OWASP API Security Top 10 sirve
como guia complementaria, no reemplaza requisitos verificables.

Identidad propia: tabla de usuarios en PostgreSQL con claves almacenadas solo
como hash (Argon2id con parametros aprobados, sal unica) y backend como BFF con
sesion en servidor y cookies HttpOnly, Secure y SameSite; sin Keycloak, OIDC ni
tokens en el navegador. Exigir comparacion en tiempo constante, politica de claves,
limite de intentos/bloqueo, rotacion del ID de sesion tras login, CSRF, CORS
restrictivo, expiracion de sesion y autorizacion por rol, pertenencia y objeto.
MFA/step-up y recuperacion de cuenta quedan sujetos a Q-11, especialmente para
operaciones privilegiadas y reversos.

TLS en los limites desplegados; secretos fuera de Git y rotacion documentada.
Usuarios SQL distintos para runtime, migraciones y lectura operativa. Auditoria
append-only con control de acceso, exportacion y verificacion de integridad;
no declarar inmutabilidad ante administradores sin almacenamiento protegido.
Segregacion de funciones y doble control para ajustes/reversos se difieren con
HU-05/Q-08; no se habilitan esas acciones en el alcance actual. Meilisearch
requiere filtros de ownership impuestos por BFF y verificacion SQL actual,
incluidos snippets, facets y conteos; sin credenciales ni acceso desde el cliente.
Conceptos y retencion del indice requieren revision de privacidad Q-13/Q-17.

Modelar amenazas, probar abuso de objetos, fuerza bruta/enumeracion de usuarios,
replay, escalacion
de privilegios y exposicion de datos. Construccion requiere SAST/SCA, SBOM,
secret scanning y pruebas dinamicas segun riesgo.

## Alternativas

JWT en localStorage simplifica el cliente, pero aumenta exposicion frente a XSS.
Keycloak/OIDC aporta un IdP maduro, pero se descarta por alcance del laboratorio;
asume el riesgo de custodiar claves propias, mitigado con hash fuerte y pruebas.
Declarar cumplimiento por usar ASVS confunde controles con certificacion.

## Consecuencias y verificacion

El BFF agrega sesiones y exige controles CSRF. Cada control tendra ID, amenaza,
prueba y evidencia. Peru, SBS/BCRP, proteccion de datos y PCI DSS requieren
evaluacion especializada de aplicabilidad antes de fondos reales; no se
almacenaran PAN/CVV ni datos reales de identidad en este laboratorio.