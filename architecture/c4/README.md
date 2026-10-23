# Diagramas C4

Modelo objetivo, no despliegue existente. Diagramas Mermaid con notacion C4:
personas, sistema, contenedores y componentes con responsabilidades y tecnologias.
Sin sistemas externos: no hay proveedores de pago ni KYC, reales o simulados.
Alcance: HU-01 -> HU-02 -> HU-04. No se diagraman como activos comercios,
soporte/disputas ni conciliacion operativa. Todo nodo ejecutable se desplegara
en contenedores OCI con Compose compatible con Docker y Podman Desktop.

## Nivel 1: Contexto

```mermaid
flowchart LR
    payer["Persona: pagador"]
    contact["Persona: contacto\nOtro usuario de la wallet que recibe el pago"]
    wallet["Sistema: Seven Team Wallet\nOnboarding, pagos entre contactos, idempotencia e historial buscable"]
    payer -->|"Onboarding, pago a un contacto y confirmacion"| wallet
    wallet -->|"Saldo y movimiento acreditado"| contact
```

## Nivel 2: Contenedores

```mermaid
flowchart TB
    users["Persona: pagador"]
    subgraph boundary["Sistema Seven Team Wallet - OCI / Compose en Podman Desktop"]
        web["Contenedor: Web Angular\nOnboarding, pago e historial"]
        api["Contenedor: Backend Java 21 / Spring Boot\nBFF, autenticacion propia, API REST, modulos y workers"]
        db[("Contenedor: PostgreSQL\nUsuarios con clave hasheada, contactos, ledger, idempotencia y outbox")]
        search[("Contenedor: Meilisearch\nRead model de movimientos y conceptos")]
        collector["Contenedor: OTel Collector\nRedaccion y exportacion OTLP"]
        metrics["Contenedor: Prometheus\nMetricas"]
        traces["Contenedor: Tempo\nTrazas"]
        logs["Contenedor: Loki\nLogs"]
        grafana["Contenedor: Grafana\nDashboards operativos"]
    end
    users --> web
    web -->|"HTTPS, cookie de sesion, REST"| api
    api -->|"SQL: usuarios, commands y lecturas autoritativas"| db
    api -->|"Worker outbox: proyeccion; BFF: busqueda con ownership"| search
    api -->|"OTLP"| collector
    collector --> metrics
    collector --> traces
    collector --> logs
    grafana --> metrics
    grafana --> traces
    grafana --> logs
```

PostgreSQL es tecnologia compartida, no licencia para compartir tablas entre
modulos. Las claves se guardan solo como hash en la tabla de usuarios; el
navegador recibe una cookie de sesion de servidor, sin tokens persistentes.
El worker no es un microservicio separado en este modelo.
Meilisearch no tiene acceso desde el navegador y no es autoridad financiera.
Su volumen es independiente del SQL. Un perfil de herramientas separado alojara
CrewAI y OpenSpec, sin acceso a datos financieros ni socket del motor.

## Nivel 3: Componentes del backend

```mermaid
flowchart LR
    inbound["Adaptadores de entrada\nREST/BFF y scheduler"]
    auth["Seguridad\nLogin con hash de clave, sesion, CSRF, RBAC y ownership"]
    onboarding["identity-onboarding\nUsuarios, contactos, pasos y activacion"]
    payments["payments\nPago entre contactos, estados, idempotencia y queries"]
    idem["Filtro de idempotencia\nClave, fingerprint, replay y conflicto"]
    ledger["wallet-ledger\nCuentas y doble partida"]
    movementSearch["movement-search\nQueries por concepto y movimientos autorizados"]
    projection["Worker de proyeccion\nOutbox, version y checkpoint de indexacion"]
    analytics["analytics\nEventos y proyecciones de negocio"]
    ports["Puertos de salida\nRepositorios y eventos"]
    sql["Adaptadores SQL\nPostgreSQL y outbox"]
    index["Adaptador de busqueda\nMeilisearch HTTP/SDK"]
    inbound --> auth
    auth --> onboarding
    auth --> payments
    auth --> idem
    idem -->|"Reserva clave UNIQUE y decide replay"| payments
    auth --> movementSearch
    payments -->|"API interna, transaccion local"| ledger
    projection -->|"Lee outbox SQL; confirma tareas del indice"| ports
    onboarding --> ports
    payments --> ports
    ledger --> ports
    movementSearch -->|"Busqueda y verificacion de ownership SQL"| ports
    analytics --> ports
    ports -.->|"Implementado por"| sql
    ports -.->|"Implementado por"| index
```

Dentro de cada modulo: adaptadores -> application -> domain. Las flechas entre
componentes son colaboraciones, no dependencias del dominio sobre SQL. Analitica
consume eventos durables via worker; no condiciona el commit financiero.
El filtro de idempotencia es un componente del mismo backend (sin microservicio
ni broker); persiste claves en PostgreSQL, nunca en
Meilisearch ni memoria. El pago, la clave y el outbox se confirman en una sola
transaccion. Retencion y plazos siguen pendientes de Q-07.

## Vistas complementarias

CrewAI y OpenSpec son herramientas de desarrollo fuera del sistema de pagos:
el [flujo de agentes](../../agents/flows/README.md) no tiene acceso al ledger.
Nivel 4 (codigo) se agrega solo cuando exista codigo que diagramar. Al crear
Compose se anadira una vista de despliegue verificada con Podman Desktop y Docker.