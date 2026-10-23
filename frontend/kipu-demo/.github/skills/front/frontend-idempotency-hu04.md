---
name: frontend-idempotency-hu04
description: Estandariza la definicion frontend de reintentos HU-04 para conservar el intento original y evitar duplicados visibles.
---

# Skill: Frontend Idempotencia HU-04 -> Spec Checklist

## 1) Metadata

- **Skill ID:** frontend-idempotency-hu04
- **Version:** 0.1.0
- **Purpose:** Definir requisitos de UX y validacion frontend para reintentos, sin atribuir al navegador la garantia financiera.
- **Audience (roles):** Chapter/PO, Tech Lead, Backend, Frontend, QA, Cyber.
- **When to use:** Antes de crear tareas frontend HU-04 o habilitar reintentos de pago.
- **When NOT to use:** Incidentes P1, cambios triviales o definicion/implementacion de la garantia backend fuera de alcance frontend.
- **Sensitive inputs:** Solo datos sinteticos; no incluir claves, DNI/celulares reales, credenciales, secretos o tokens.
- **Expected output:** Un documento Markdown con la estructura de Output.

## 2) Inputs

- **Business context (brief):** Evitar que un reintento de transporte cree otro intento financiero.
- **Feature request / user story:** HU-04 y criterios de aceptacion.
- **Expected impact (metric or outcome):** Repeticiones reconocibles por contrato; no afirmar garantias frontend.
- **Scope (in/out):** Estado, interaccion y consulta del intento original; fuera queda la implementacion de claves/invariantes en servidor.
- **Known technical constraints:** Contrato BFF, referencia de pago, identidad de clave y recuperacion aprobadas.
- **Known risks:** Clave nueva ante timeout, reenvio automatico, expiracion o payload distinto.
- **Dependencies:** Q-07, contrato de pago, HU-02, verificacion backend de HU-04, Security y Testing.
- **Team Definition of Done (DoD):** Si existe.

Referencias: [HU-04](../../../docs/requirements/user-stories/payment-idempotency-protection.sp.md),
[HU-02](../../../docs/requirements/user-stories/payer-low-value-payment-confirmation.sp.md)
y [preguntas abiertas](../../../docs/requirements/open-questions.md).

## 3) Output

Devuelve solo un documento Markdown con estas secciones:

1. **Summary**
2. **Scope**
   - Dentro del alcance: interaccion de reintento, consulta del intento original y mensajes de incertidumbre.
   - Fuera del alcance: algoritmo, persistencia, retencion y garantia financiera del backend.
3. **Supuestos**
4. **Decisiones tecnicas por tomar (pendientes o resueltas)**
5. **Riesgos y mitigaciones**
6. **Criterios de aceptacion (medibles)**
7. **Plan de validacion**
   - Pruebas unitarias de estado/interaccion
   - Pruebas funcionales de repeticion y recuperacion
   - Seguridad: manejo de clave, sesion y datos de pago
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

- No inventar formato, alcance, ventana o retencion de la clave; Q-07 debe resolverlo.
- Para repetir la misma operacion, conservar la clave original si el contrato asigna su manejo al cliente; no crear otra por doble clic, timeout o repeticion de transporte.
- HTTP 202, timeout o desconexion implican resultado incierto, no fallo; consultar por el mecanismo aprobado y no iniciar otro pago mientras el original pueda ejecutarse.
- La idempotencia financiera corresponde al backend/PostgreSQL; un boton deshabilitado no la garantiza.
- No exponer claves ni persistirlas en `localStorage`; respetar el mecanismo de recuperacion aprobado.
- No habilitar pagos antes de verificar HU-04 ni declarar una garantia basada solo en pruebas UI.

## 5) Validation Rules

El documento de salida es valido si:

- Incluye las nueve secciones y separa responsabilidades de frontend y backend.
- Tiene al menos tres criterios verificables que distinguen repeticion, incertidumbre y resultado original.
- Incluye al menos dos riesgos con mitigaciones concretas.
- En tareas por rol, da al menos tres tareas a Tech Lead, Backend y QA o explica por que no aplican; toda dependencia backend queda identificada.
- El plan valida doble envio, timeout/202, recuperacion y evidencia real; escenarios dependientes de Q-07 quedan bloqueados.
- No contiene claves, datos personales reales ni supuestos sin declarar.

## 6) Evidence

- Referenciar este archivo versionado y HU-04/CA1-4.
- Adjuntar el documento de salida, matriz de escenarios de repeticion/recuperacion y resultados reales cuando existan.
- Los ejemplos `examples/input.sample.md` y `examples/output.sample.md` quedan pendientes hasta que se creen; no afirmar que existen.
- Tag sugerido: `skill-frontend-idempotency-hu04-v0.1.0`. No crear tags ni commits automaticamente.