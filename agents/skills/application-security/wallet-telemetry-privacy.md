---
name: wallet-telemetry-privacy
description: "Usar para verificar que logs, trazas y métricas no filtran PII ni tokens."
---

# Privacidad en telemetría

## Procedimiento

1. Revisar logs del backend y del frontend (`console.*`, reporte de errores).
2. Verificar que trazas/atributos OTel no incluyen documento, teléfono, importes
   con identidad, tokens ni claves de idempotencia en claro.
3. Métricas con cardinalidad acotada (sin IDs de usuario como etiqueta).
4. Mensajes de error al cliente genéricos, sin stack traces ni detalles SQL.

## Salida

Puntos de fuga con evidencia, severidad y corrección propuesta.
