# Frontend previsto

Todavia no hay workspace Angular ni package.json. Se preve Angular/TypeScript
strict, web responsive para el pagador. Secuencia activa: HU-01 -> HU-02 -> HU-04.
Comercio, soporte/disputas y conciliacion operativa quedan diferidos. No se
requiere app nativa en esta fase. Build Node/Angular y servidor web se ejecutaran
en contenedores OCI/Compose compatibles con Docker y Podman Desktop, sin Node host.

## Areas funcionales

| Area | HU | Vistas por definir |
| --- | --- | --- |
| Onboarding | HU-01 | Registro, login, pasos, validacion de identidad interna y activacion |
| Pagos entre contactos | HU-02 | Contacto/monto, confirmacion, resultado e historial |
| Idempotencia | HU-04 | Reintento seguro, referencia original y ausencia de doble cobro |
| Busqueda de movimientos/conceptos | Extension HU-02 CA3 | Busqueda, filtros y paginacion por aprobar en Q-17 |

Router por capacidades y roles, Reactive Forms y contratos OpenAPI. La UI no
es una frontera de autorizacion; el servidor valida propiedad, permisos y monto.
Integracion con BFF mediante sesion protegida, sin tokens en localStorage.

Disenar estados de carga, validacion, error, reintento con la misma clave,
expiracion segura y
recuperacion, asi como accesibilidad por teclado y lectores. No mostrar exito
por un HTTP 202 ni habilitar otro pago mientras el anterior pueda ejecutarse.
Proponer WCAG 2.2 AA como objetivo de verificacion, no conformidad ya obtenida.

## Antes de construir

El cliente consulta al BFF, nunca directamente a Meilisearch. Mostrar de forma
distinta busqueda vacia, indice atrasado y servicio no disponible. La confirmacion
por referencia consulta la autoridad PostgreSQL; no deducir pago fallido por
ausencia de un resultado de busqueda. No mostrar snippets o conteos ajenos.

Definir wireframes y sistema visual con los agentes de diseno, confirmar estados
y contratos, fijar Angular/Node LTS compatibles y lockfile. Luego documentar
comandos reales y pruebas TestBed/Playwright responsive. No instalar un framework
UI ni generar pantallas antes de aprobar ese diseno.