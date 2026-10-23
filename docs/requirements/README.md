# Requisitos y trazabilidad

## Fuentes originales

Importados de `C:/Users/Usuario/Downloads/userstories/packages` sin modificar
contenido, nombres ni enlaces relativos. Los IDs HU son alias del indice, no
una renumeracion del material fuente. Hay una epica y seis historias.

Epica: [MVP de wallet en Peru](epic/peru-wallet-mvp.sp.md).

| ID | Original | Criterios | Capacidad objetivo |
| --- | --- | --- | --- |
| HU-01 | [Registro y activacion](user-stories/user-onboarding-mvp-completion.sp.md) | CA1-6 | Onboarding, identidad, activacion y adquisicion |
| HU-02 | [Confirmacion de pagos](user-stories/payer-low-value-payment-confirmation.sp.md) | CA1-6 | P2P, confirmacion, historial y activacion |
| HU-03 | [Estado QR para comercios](user-stories/merchant-qr-payment-status-visibility.sp.md) | CA1-4 | Cobros QR, callbacks y consultas |
| HU-04 | [Idempotencia](user-stories/payment-idempotency-protection.sp.md) | CA1-4 | Prevencion de duplicidad financiera |
| HU-05 | [Fallas y reversos](user-stories/payment-failure-reversal-handling.sp.md) | CA1-4 | Soporte, investigacion, disputa y auditoria |
| HU-06 | [Conciliacion](user-stories/operations-transaction-reconciliation.sp.md) | CA1-4 | Intencion, proveedor y ledger diario |

## Alcance activo y secuencia

La secuencia solicitada es la siguiente, conservando los IDs del indice original:

1. HU-01: `user-onboarding-mvp-completion.sp.md`.
2. HU-02: `payer-low-value-payment-confirmation.sp.md`.
3. HU-04: `payment-idempotency-protection.sp.md`.

HU-03 (comercios/QR), HU-05 (soporte/disputas) y HU-06 (conciliacion operativa)
quedan diferidas. Se conservan sus originales como referencia, no como backlog
activo. La epica original es mas amplia que este incremento y no se modifica.

La secuencia de refinamiento/entrega no autoriza pagos sin proteccion contra
duplicados: los invariantes de HU-04 condicionan la habilitacion de HU-02.

## Cobertura activa a definir

- HU-01 CA1-3: pasos, validacion de identidad interna, usuarios con clave hasheada y activacion de wallet.
- HU-01 CA4-6: eventos por paso, frontera temporal, cohortes y atribucion de gasto.
- HU-02 CA1-4: identidad del destino (un contacto), limites, estados, referencia e historial.
- HU-02 CA5-6: funnel de checkout y evento de activacion para MAU.
- HU-04 CA1-4: alcance/retencion de claves, replay, correlacion y evidencia original/reintento.

HU-04 CA4 conserva evidencia que distingue originales/reintentos en salidas de
control; no exige construir toda la funcionalidad diaria de HU-06 en este alcance.

## Requisitos tecnicos adicionales solicitados

CQRS con PostgreSQL para comandos/datos financieros y Meilisearch para busqueda
de movimientos y por conceptos, como extension del historial de HU-02 CA3.
La definicion funcional de concepto/filtros se cierra en Q-17; no se atribuye
este requisito nuevo al texto original. El indice es eventual y reconstruible;
no sustituye al ledger ni determina el resultado de un pago.

Todo el entorno futuro debe levantarse en contenedores OCI mediante Compose
compatible con Docker y Podman Desktop. Se mantiene la fase de documentacion.

Sin proveedores externos ni simulados (sin WireMock): los pagos son transferencias
internas entre contactos, liquidadas en el ledger. La identidad es una tabla de
usuarios con claves hasheadas en PostgreSQL, sin Keycloak/OIDC. Las HU originales
que hablan de proveedores, rieles o KYC simulado no se modifican; su alcance se
cierra con producto en Q-01, Q-05 y Q-18.

La futura especificacion debe relacionar cada CA con escenarios y pruebas. Este
indice no reemplaza los criterios originales ni declara su implementacion.

## Objetivos de negocio de la epica

Checkout: caida de 30% a 8%; onboarding: de 8 a 3 minutos; MAU entre 1,000 y
2,000; CAC de PEN 10 durante meses 1-3; lanzamiento en un trimestre. Son objetivos
de producto, no resultados obtenidos ni criterios demostrables con datos ficticios.
La epica y HU difieren en la formulacion temporal del objetivo de checkout:
validar la ventana exacta con producto.

Ver [preguntas y bloqueos](open-questions.md) y el
[cambio inicial OpenSpec](../../openspec/changes/define-wallet-mvp/proposal.md).