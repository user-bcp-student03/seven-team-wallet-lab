---
name: angular-frontend
description: Estandariza la definicion de funcionalidades Angular del wallet antes de implementarlas, con alcance, decisiones, riesgos, aceptacion y validacion trazables.
---

# Skill: Angular Frontend -> Feature Intake

## 1) Metadata

- **Skill ID:** angular-frontend
- **Version:** 0.1.0
- **Purpose:** Estandarizar propuestas frontend Angular previas a la implementacion, sin reemplazar la skill especifica de HU.
- **Audience (roles):** Frontend, AI Engineering, PO, Tech Lead, Backend, QA, Cyber.
- **When to use:** Antes de crear tareas de implementacion frontend o abrir un PR funcional significativo.
- **When NOT to use:** Incidentes P1, cambios triviales o tareas que no alteren comportamiento frontend.
- **Sensitive inputs:** Solo datos sinteticos; no incluir PII real, credenciales, secretos, tokens ni URLs internas no autorizadas.
- **Expected output:** Un documento Markdown con la estructura de Output.

## 2) Inputs

Proporciona la informacion disponible en este formato; declara lo que falte:

- **Business context (brief):**
- **Feature request / user story:** HU activa y criterios de aceptacion.
- **Expected impact (metric or outcome):**
- **Scope (in/out):**
- **Known technical constraints:** Angular/TypeScript y convenciones aprobadas.
- **Known risks:** Seguridad, privacidad, accesibilidad y estabilidad.
- **Dependencies:** Contratos BFF, diseno, Security y plan de Testing.
- **Team Definition of Done (DoD):** Si existe.

Referencias: [limites frontend](../../../frontend/README.md), requisitos activos
y la skill especifica de HU aplicable.

## 3) Output

Devuelve solo un documento Markdown con estas secciones:

1. **Summary**
2. **Scope**
   - Dentro del alcance
   - Fuera del alcance
3. **Supuestos**
4. **Decisiones tecnicas por tomar (pendientes o resueltas)**
5. **Riesgos y mitigaciones**
6. **Criterios de aceptacion (medibles)**
7. **Plan de validacion**
   - Pruebas unitarias
   - Pruebas funcionales
   - Seguridad (comprobaciones minimas)
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

- No inventar requisitos, APIs, estados ni politicas; registrar lo desconocido en Preguntas abiertas.
- No proponer herramientas o dependencias fuera del stack aprobado.
- No incluir datos sensibles, ni registrar PII en logs, URLs o telemetria.
- Distinguir propuestas, decisiones aprobadas y evidencia ejecutada.
- No tratar la UI como frontera de autorizacion; consumir el BFF y nunca acceder directamente a Meilisearch.
- No generar codigo ni afirmar que existe una aplicacion Angular: este repositorio aun no tiene workspace frontend.
- Seguir la skill de HU para limites funcionales, pagos y datos personales.

## 5) Validation Rules

El documento de salida es valido si:

- Incluye las nueve secciones y las subsecciones indicadas en Output.
- Tiene al menos tres criterios verificables y al menos dos riesgos con mitigaciones.
- Para Tech Lead, Backend y QA propone al menos tres tareas cada uno o explica por que el rol no aplica a este alcance frontend.
- Separa tareas frontend de dependencias/revisiones de otros roles.
- Incluye evidencia concreta y no presenta checks pendientes como ejecutados.
- No contiene secretos ni supuestos sin declarar.

## 6) Evidence

- Referenciar este archivo versionado y la HU/criterios que sustentan la propuesta.
- Adjuntar el documento de salida, resultados reales de checks y evidencia visual o checklist cuando existan.
- Los ejemplos `examples/input.sample.md` y `examples/output.sample.md` quedan pendientes hasta que se creen; no afirmar que existen.
- Tag sugerido: `skill-angular-frontend-v0.1.0`. No crear tags ni commits automaticamente.