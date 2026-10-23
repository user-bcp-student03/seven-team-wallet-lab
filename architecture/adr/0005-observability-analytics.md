# ADR-0005: OpenTelemetry y analitica separada de auditoria

- Fecha: 2026-10-23
- Estado: Propuesto.
- Referencias activas: HU-01 CA4-6, HU-02 CA3/CA5-6, HU-04 CA3; Q-02, Q-03, Q-12, Q-13, Q-17.

## Contexto

Se necesitan diagnostico tecnico, evidencia financiera y medicion de funnel.
Las trazas muestreadas no garantizan cobertura de auditoria o contabilidad.

## Decision

OTel para trazas, metricas y logs correlacionados, exportados via Collector a
Tempo, Prometheus y Loki con Grafana. Java agent para instrumentacion tecnica y
SDK/manual spans para casos de uso. Evitar spans duplicados y verificar
propagacion al procesar outbox y jobs.

Separar tres planos: telemetria tecnica muestreable, eventos de negocio durables
deduplicados y auditoria de acciones con acceso restringido. Los dos ultimos
persisten en SQL y no dependen de que una traza haya sido muestreada.

No incluir DNI, alias, nombres, tokens, payloads de pago ni claves de idempotencia
en logs/spans. IDs de transaccion solo en trazas/logs restringidos, nunca como
labels de metricas. Aplicar allowlist y sanitizacion en origen y Collector.

Analitica calcula duracion mediana, abandonos, MAU y CAC sobre eventos cuya
definicion debe aprobar producto. No tratar todos los eventos tecnicos como
activacion ni presentar datos sinteticos como resultado comercial real.

## Alternativas

Solo logs limita correlacion; usar trazas como ledger pierde eventos al muestrear.
Una plataforma analitica separada no se justifica todavia por el volumen esperado.

## Consecuencias y verificacion

Mantener pruebas de propagacion, redaccion y duplicados; dashboards de latencia,
errores, antiguedad de pendientes, backlog outbox, lag de Meilisearch, tareas de
indexacion fallidas y reindex. Reportes de descalce diario se difieren con HU-06.
Umbrales y retencion
se aprueban en Q-12/Q-13, no se deducen de la expectativa 24x7x365.