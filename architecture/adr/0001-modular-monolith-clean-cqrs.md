# ADR-0001: Monolito modular, Clean Architecture y CQRS

- Fecha: 2026-10-23
- Estado: Propuesto; estilo base acordado, detalles sujetos a revision.
- Referencias activas: HU-01 -> HU-02 -> HU-04; HU-03/HU-05/HU-06 diferidas.

## Contexto

La epica apunta a 1,000-2,000 MAU y lanzamiento en un trimestre. La integridad
financiera y la consistencia local pesan mas que el escalado independiente.

## Decision

Un backend desplegable Java 21/Spring Boot, organizado por capacidades. Dentro
de cada modulo: domain, application, adapters/in y adapters/out. El dominio
define invariantes y objetos de valor; application orquesta casos de uso y
puertos. Los adaptadores implementan REST, SQL y Meilisearch; no hay
proveedores externos ni IdP.

CQRS separa commands y queries con contratos distintos. Commands validan
invariantes sobre PostgreSQL; queries de movimientos/conceptos usan Meilisearch
segun [ADR-0007](0007-cqrs-postgresql-meilisearch.md). Lecturas de resultado,
saldo e idempotencia siguen siendo autoritativas en PostgreSQL.
La confirmacion financiera no puede depender solo de una proyeccion atrasada.
No se adopta event sourcing ni un bus remoto como requisito de CQRS.

ArchUnit verificara dependencia hacia el dominio y limites entre modulos.
La interaccion pagos-ledger tendra una API interna explicita y una transaccion
local documentada; no acceso directo a repositorios privados entre modulos.

## Alternativas

Microservicios: mas aislamiento, pero sagas, redes y operacion prematuras.
Monolito por capas globales: sencillo al principio, pero diluye propiedad del dominio.

## Consecuencias y verificacion

Despliegue unico y fronteras ACID locales a cambio de escalado conjunto. Probar
reglas ArchUnit y casos de uso sin arrancar Spring. Extraer servicios solo ante
necesidad medida y con ADR que explique las nuevas garantias de consistencia.
Aplicaciones, dependencias y herramientas se empaquetaran en contenedores OCI
con Compose compatible con Docker y Podman Desktop; no se exige runtime host.