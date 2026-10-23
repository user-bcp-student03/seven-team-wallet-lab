---
name: frontend-payment-hu02
description: Estandariza la definicion frontend del pago P2P HU-02 identificado por DNI, con confirmacion y estados verificables.
---

# Skill: Frontend Pago P2P HU-02 -> Spec Checklist

## 1) Metadata

- **Skill ID:** frontend-payment-hu02
- **Version:** 0.1.0
- **Purpose:** Definir una propuesta frontend trazable para el pago P2P HU-02 antes de habilitar implementacion.
- **Audience (roles):** Chapter/PO, Tech Lead, Backend, Frontend, QA, Cyber.
- **When to use:** Antes de crear tareas frontend de HU-02 o abrir un PR funcional significativo.
- **When NOT to use:** Incidentes P1, cambios triviales o pagos con dinero/proveedores reales.
- **Sensitive inputs:** Solo datos sinteticos; no usar DNI/celulares reales, credenciales, secretos o tokens.
- **Expected output:** Un documento Markdown con la estructura de Output.

## 2) Inputs

- **Business context (brief):**
- **Feature request / user story:** HU-02 y criterios de aceptacion.
- **Expected impact (metric or outcome):** Confirmacion comprensible del resultado; no declarar objetivos de checkout o MAU como resultados.
- **Scope (in/out):** Identificar destino por DNI, revisar monto y confirmar/consultar resultado; excluir conceptos/filtros pendientes de Q-17.
- **Known technical constraints:** BFF aprobado, moneda PEN y fuente autoritativa de estado.
- **Known risks:** DNI de tercero, cambio de monto/destino, resultado incierto o doble envio.
- **Dependencies:** Contratos BFF, Q-04, Q-05, Q-11, HU-04 verificada, Security y Testing.
- **Team Definition of Done (DoD):** Si existe.

Referencias: [HU-02](../../../docs/requirements/user-stories/payer-low-value-payment-confirmation.sp.md),
[limites frontend](../../../frontend/README.md) y [preguntas abiertas](../../../docs/requirements/open-questions.md).

## 3) Output

Devuelve solo un documento Markdown con estas secciones:

1. **Summary**
2. **Scope**
   - Dentro del alcance: DNI destino, monto, revision, confirmacion, referencia e historial segun contrato.
   - Fuera del alcance: reglas no aprobadas, pagos reales y busqueda por conceptos/filtros hasta resolver Q-17.
3. **Supuestos**
4. **Decisiones tecnicas por tomar (pendientes o resueltas)**
5. **Riesgos y mitigaciones**
6. **Criterios de aceptacion (medibles)**
7. **Plan de validacion**
   - Pruebas unitarias de validaciones y mapeo de estados
   - Pruebas funcionales de revision, confirmacion e historial
   - Seguridad: sesion, datos del destinatario y errores
   - Evidencia requerida
8. **Tareas sugeridas por rol**
   - Chapter/PO
   - Tech Lead
   - Backend
   - Frontend
   - QA
   - Cyber
9. **Preguntas abiertas**

## 4) Constraints

- Tratar DNI como string; si el formato de ocho digitos ASCII no esta aprobado por el contrato, presentarlo solo como propuesta pendiente.
- Mostrar identidad del destino y monto antes de confirmar, conforme al contrato; DNI no es autenticacion ni prueba de identidad.
- Usar PEN y precision decimal; no inventar limite, redondeo o frecuencia mientras Q-04 siga abierto.
- No declarar terminal un HTTP 202, timeout, desconexion o ausencia de resultado de busqueda; consultar el estado autoritativo.
- No habilitar pagos antes de verificar las invariantes de HU-04.
- No acceder a PostgreSQL, Meilisearch o proveedores desde el navegador; no exponer DNI en logs, URLs o telemetria.

## 5) Validation Rules

El documento de salida es valido si:

- Incluye las nueve secciones y separa decisiones aprobadas, propuestas y bloqueos.
- Tiene al menos tres criterios verificables para revision del DNI/destino y monto, confirmacion y resultado/referencia.
- Incluye al menos dos riesgos con mitigaciones concretas.
- En tareas por rol, da al menos tres tareas a Tech Lead, Backend y QA o explica por que no aplican; no asigna a frontend autorizacion financiera.
- El plan cubre estados inciertos y evidencia realmente obtenible.
- No contiene datos reales ni supuestos sin declarar.

## 6) Evidence

- Referenciar este archivo versionado y HU-02/CA1-6.
- Adjuntar el documento de salida, matriz criterio/escenario y resultados reales de pruebas cuando existan.
- Los ejemplos `examples/input.sample.md` y `examples/output.sample.md` quedan pendientes hasta que se creen; no afirmar que existen.
- Tag sugerido: `skill-frontend-payment-hu02-v0.1.0`. No crear tags ni commits automaticamente.