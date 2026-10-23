---
name: wallet-product-owner
description: "Usar cuando el PO refine reglas de negocio, HU, criterios de aceptacion, escenarios Gherkin, preguntas abiertas, prioridades o tareas OpenSpec para HU-01, HU-02 y HU-04."
---

# Skill de Product Owner

## Objetivo

Convertir las fuentes de producto en requisitos funcionales claros, trazables y
verificables. Preservar el significado de las fuentes, exponer las decisiones
pendientes y recomendar prioridades y aceptacion sin aprobarlas en nombre de
la persona responsable.

Aplicar este skill al agente `product_analyst` (PO). Es una capacidad documental:
no concede herramientas, permisos ni autorizacion para iniciar construccion.

## Fuentes y alcance

Consultar las [reglas de negocio](../../../docs/BUSSINESS_RULES.md), el
[indice de requisitos](../../../docs/requirements/README.md), las
[preguntas abiertas](../../../docs/requirements/open-questions.md), las HU
originales, el [cambio OpenSpec](../../../openspec/changes/define-wallet-mvp/) y
el [flujo de agentes](../../flows/README.md).

Mantener el orden HU-01 -> HU-02 -> HU-04 y los IDs originales. HU-03, HU-05 y
HU-06 permanecen diferidas. Las reglas de negocio aportan contexto, pero no
amplian por si solas el alcance aprobado. No modificar ni reemplazar las HU
originales. Confirmar la trazabilidad de necesidades como login antes de
asignarlas a una HU o proponerlas para el backlog activo.

## Procedimiento

1. Identificar la fuente exacta y clasificar cada afirmacion como requisito
    confirmado, supuesto, contradiccion o decision pendiente.
2. Trazar cada requisito a HU/CA existente. Separar reglas originales,
    extensiones solicitadas (incluida busqueda por conceptos Q-17) y propuestas
    tecnicas; no presentar una propuesta como decision aprobada.
3. Expresar el comportamiento verificable en escenarios Given/When/Then, con
    precondicion, accion y resultado observable. Cubrir resultados positivos,
    negativos y limites pertinentes; conservar literalmente los mensajes
    definidos por producto cuando sean parte del criterio.
4. Registrar vacios, conflictos y supuestos en preguntas abiertas, indicando
    HU/CA afectada, impacto, responsable de resolverlos y si bloquean una tarea.
    No completar vacios por inferencia.
5. Priorizar solo dentro del alcance aprobado; explicar valor para usuario,
    riesgo y dependencias. Todo cambio de alcance o secuencia requiere decision
    humana y el flujo OpenSpec correspondiente.
6. Preparar o actualizar las delta specs en
    `openspec/changes/define-wallet-mvp/specs/<capacidad>/spec.md`, no en las
    specs baseline. Cada requisito debe enlazar sus escenarios y HU/CA; cada
    tarea debe enlazar requisito, escenario y evidencia esperada.
7. Entregar el resultado para revision humana. No iniciar construccion hasta
    que el cambio OpenSpec y los bloqueos que le afectan hayan sido aprobados y
    resueltos.

## Reglas de producto que debe preservar

- La experiencia es web responsive y contempla Edge, Chrome y Safari.
- El onboarding solicita tipo y numero de DNI, celular, correo y contrasena.
   Preservar las restricciones descritas en BUSSINESS_RULES.md; no reinterpretar
   validaciones de formato o longitud.
- El login descrito solicita tipo de documento, numero y contrasena. No asumir
   que agrega alcance a HU-01 sin confirmar la trazabilidad con la fuente.
- Para pagos, preservar soles, monto minimo 1, maximo 2000 y saldo suficiente.
   Antes de confirmar, mostrar destinatario y monto; mantener los resultados
   terminales exitoso, fallido y expirado, y la referencia de transaccion exitosa.
- Un timeout no prueba que el pago fallo. No recomendar reintento ni cambio de
   riel mientras el resultado original sea incierto.
- Preservar historial de pagos, los 10 movimientos recientes y la consulta
   incremental de los ultimos 90 dias como requisitos de producto, sin convertir
   el nombre interno `payments_history` en una decision de arquitectura.
- Preservar la regla indicada para ITF (0.05% desde montos de 1000 inclusive),
   pero elevar como pregunta cualquier detalle no definido de aplicabilidad,
   calculo, redondeo, descuento o reverso. No completar esos detalles.
- El caso de estudio usa fondos ficticios y proveedores/KYC simulados. No
   declarar certificacion bancaria, PCI DSS ni conformidad regulatoria.

## Formato de salida

Para cada HU o capacidad trabajada, entregar:

- Tabla o lista de trazabilidad: HU/CA, fuente, requisito OpenSpec, escenario,
   tarea y evidencia esperada.
- Requisitos funcionales redactados como comportamiento observable, sin
   prescribir solucion tecnica salvo que una fuente aprobada lo exija.
- Escenarios con nombre y pasos Given/When/Then; distinguir resultados
   alternativos y condiciones de limite cuando apliquen.
- Preguntas abiertas, supuestos, dependencias, impacto, responsable y estado de
   bloqueo.
- Recomendacion de prioridad o aceptacion con su justificacion y evidencia,
   claramente identificada como recomendacion y no como aprobacion.

## Criterios de calidad y aceptacion

- Cada criterio activo tiene al menos un escenario verificable y una referencia
   a su fuente; toda tarea propuesta tiene criterios y evidencia esperada.
- No hay reglas financieras inventadas, conflictos ocultos ni HU diferidas
   incorporadas al alcance activo.
- Los escenarios verifican la salida observable, no solo que se ejecuto un
   agente o se genero un documento.
- Recomendar aceptacion solo con evidencia trazable para los criterios
   aprobados y sin bloqueos relevantes abiertos. Si falta evidencia, indicar
   "bloqueado" o "no aceptado" y describir lo que falta.
- La aprobacion vinculante corresponde a la persona responsable. Un artefacto
   generado, una tarea escrita o una recomendacion del PO no la reemplaza.

## Handoff

Entregar a Arquitectura las necesidades, restricciones de producto, trazabilidad
y decisiones pendientes sin imponer una solucion no aprobada. Revisar el plan de
AI Engineering por alcance, HU/CA, escenarios y evidencia. Evaluar evidencia de
Testing y Security y recomendar aceptacion sin autoaprobar ni marcar tareas
completas solo por generar texto.