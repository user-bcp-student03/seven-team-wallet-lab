---
name: podman-observability
description: "Usar para imagenes OCI, Compose Docker/Podman Desktop, healthchecks, volumenes PostgreSQL/Meilisearch y observabilidad OpenTelemetry."
---

# Plataforma y observabilidad

## Procedimiento

1. Leer el [plan de entorno](../../../orchestration/README.md) y la
   [observabilidad objetivo](../../../architecture/observability.md).
2. Planificar imagenes fijadas y builds/checks en contenedores para aplicaciones,
   PostgreSQL, Meilisearch, OTel y runner CrewAI; sin Keycloak, WireMock ni simuladores.
3. Comprobar proveedor Compose, maquina/conexion y permisos antes del arranque
   autorizado; no asumir compatibilidad por tener Podman Desktop instalado.
4. Definir volumenes y credenciales separados, redes internas, healthchecks y
   backup/reindex. Nunca montar sockets Docker/Podman en agentes.
5. Correlacionar API/workers con OTel sin PII; medir lag y errores de indexacion,
   sin usar trazas muestreadas como ledger ni IDs como labels de alta cardinalidad.

## Salida y verificacion

Configuracion propuesta o verificada, comandos autorizados y evidencia de
healthchecks/redaccion/recuperacion. No arrancar servicios ni consumir APIs sin permiso.