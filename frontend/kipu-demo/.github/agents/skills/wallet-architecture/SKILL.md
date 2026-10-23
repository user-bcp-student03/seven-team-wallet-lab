---
name: wallet-architecture
description: "Usar para disenar modulos, Clean Architecture, CQRS PostgreSQL/Meilisearch, contratos, ADR y C4 de la wallet."
---

# Arquitectura de wallet

## Procedimiento

1. Leer la [arquitectura objetivo](../../../architecture/README.md) y el diseno
   del cambio OpenSpec autorizado; no ampliar el alcance de las tres HU activas.
2. Separar dominio Java puro, casos de uso, puertos y adaptadores del monolito.
3. Definir PostgreSQL como autoridad financiera y Meilisearch como proyeccion
   eventual para movimientos/conceptos segun
   [ADR-0007](../../../architecture/adr/0007-cqrs-postgresql-meilisearch.md).
4. Explicitar transacciones SQL, outbox, ownership, indexacion y reconstruccion;
   no introducir dual writes financieros, broker u otras bases sin ADR.
5. Planificar aplicaciones, dependencias y runner en OCI/Compose compatible con
   Podman Desktop; revisar ADR/C4 y senalar decisiones humanas pendientes.

## Salida y verificacion

Diseno con alternativas, limites y contratos; cambios propuestos de ADR/C4 y
escenarios de fallo. Distinguir arquitectura acordada, propuesta e implementada.