# Seguridad y amenazas iniciales

Propuesta pendiente de revision. No constituye certificacion ni dictamen legal.
Usar identidades sinteticas; no hay KYC externo ni verificacion de identidad real.
La identidad es propia: tabla de usuarios con claves hasheadas en PostgreSQL.

## Fronteras de confianza

Navegador no confiable -> BFF/API -> dominio/SQL; operadores -> herramientas
privilegiadas; agentes LLM -> workspace aislado, nunca base financiera. No hay
terceros externos ni IdP. El Collector es un servicio interno con configuracion
y acceso independientes.

| Amenaza | Control previsto | Evidencia requerida |
| --- | --- | --- |
| Compromiso de credenciales | Argon2id con sal unica, parametros aprobados, comparacion en tiempo constante, limite de intentos y respuestas uniformes | Hashes verificables sin claves en claro, fuerza bruta bloqueada, sin enumeracion de usuarios |
| Robo de sesion, XSS, CSRF | BFF, sesion de servidor, cookies seguras, rotacion del ID tras login, CSP, token CSRF | Pruebas de sesion, cabeceras y peticion cruzada |
| Acceso a wallet/movimientos ajenos | Autorizacion por objeto en servidor y scope de busqueda derivado de sesion | Pruebas negativas con dos pagadores, filtros manipulados y permisos desactualizados en indice |
| Doble gasto y replay | Transaccion ACID local, clave de idempotencia durable con UNIQUE | Carreras y repeticion tras reinicio |
| Pago a destino no autorizado | El destino debe ser un contacto del pagador, validado en servidor | Destino ajeno, contacto eliminado y payload alterado |
| Manipulacion del importe/destino | Validacion en servidor y confirmacion vinculada a la intencion | Payload alterado y confirmacion no coincidente |
| Fuga en busqueda/conceptos | Red interna Meilisearch, claves separadas, allowlist de campos, ownership y retencion | Snippets/facets/conteos sin datos ajenos; sin datos de identidad/tokens/claves indexadas |
| Fuga por logs/LLM | Redaccion, allowlists, contexto sintetico y acceso limitado | Pruebas de ausencia de secretos/PII |
| Dependencias comprometidas | Versiones fijadas, SCA, SBOM y revision de artefactos | Reportes y excepciones con caducidad |
| Interrupcion de un worker | Outbox recuperable y reintentos acotados | Caida del worker sin perdida de eventos ni duplicidad financiera |

## Politicas a cerrar

Roles activos propuestos: pagador y administrador tecnico del laboratorio.
Comercio, soporte, disputas y conciliacion operativa se difieren junto con
HU-03/HU-05/HU-06. MFA, sesiones, retencion, conceptos y limites se cierran en
Q-01/Q-04/Q-11/Q-13/Q-17. No habilitar ajustes de saldo manuales como atajo.
Aplicar aislamiento a volumenes/secretos de PostgreSQL y Meilisearch; el runner
CrewAI no accede a esos almacenes ni al socket de Docker/Podman.

Adoptar una matriz ASVS con version fijada al implementar y mapear cada control
aplicable a responsable, prueba automatizada/manual y evidencia. Niveles altos
no se declaran cumplidos por acumular herramientas.

## Referencias

- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [ADR de seguridad](adr/0004-security-baseline.md)