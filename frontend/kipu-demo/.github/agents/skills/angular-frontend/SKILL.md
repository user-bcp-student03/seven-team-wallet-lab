---
name: angular-frontend
description: "Usar para onboarding, confirmacion P2P, reintentos idempotentes e historial con busqueda de movimientos/conceptos en Angular responsive."
---

# Frontend Angular

## Procedimiento

1. Revisar los [limites frontend](../../../frontend/README.md), contratos y
   estados aprobados; no agregar vistas de las HU diferidas.
2. Disenar pasos, validacion accionable, destino/monto y referencia del pago;
   aplicar accesibilidad y layouts estables en escritorio y movil.
3. Consumir solo el BFF con sesion protegida; no persistir tokens en localStorage
   ni acceder directamente a Meilisearch.
4. Diferenciar pendiente/incierto, terminal, busqueda vacia, indice atrasado y
   busqueda no disponible. Un HTTP 202 o un hit ausente no decide el pago.
5. Validar reintentos sin doble cobro y busqueda por concepto segun Q-17;
   planificar TestBed/Playwright en contenedores, con evidencia real si se ejecutan.

## Salida y verificacion

Flujos o cambios acotados por HU/CA, estados, accesibilidad y evidencia responsive.
Reportar contratos bloqueantes; no inventar pantallas ni pruebas ejecutadas.