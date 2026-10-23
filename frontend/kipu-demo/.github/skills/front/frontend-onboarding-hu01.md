---
name: frontend-onboarding-hu01
description: Estandariza la definicion frontend de HU-01 para onboarding con nombre, correo electronico, DNI y numero de celular, antes de implementar.
---

# Skill: Frontend Onboarding HU-01 -> Spec Checklist

## 1) Metadata

- **Skill ID:** frontend-onboarding-hu01
- **Version:** 0.1.0
- **Purpose:** Definir una propuesta frontend trazable para el onboarding HU-01 antes de implementarlo.
- **Audience (roles):** Chapter/PO, Tech Lead, Backend, Frontend, QA, Cyber.
- **When to use:** Antes de crear tareas frontend de HU-01 o abrir un PR funcional significativo.
- **When NOT to use:** Incidentes P1, cambios triviales o trabajo de backend/KYC fuera del cliente web.
- **Sensitive inputs:** Solo datos sinteticos; no usar nombres, correos, DNI o celulares reales, ni secretos o tokens.
- **Expected output:** Un documento Markdown con la estructura de Output.

## 2) Inputs

- **Business context (brief):**
- **Feature request / user story:** HU-01 y sus criterios de aceptacion.
- **Expected impact (metric or outcome):** Flujo de onboarding claro; no afirmar objetivos de negocio como resultados.
- **Scope (in/out):** Formulario de nombre, correo electronico, DNI y numero de celular; excluir KYC real y pagos.
- **Known technical constraints:** Angular previsto; version, componentes y contrato receptor pendientes de aprobacion.
- **Known risks:** Exposicion de datos personales, alta duplicada, datos incompatibles con el contrato.
- **Dependencies:** Diseno, contrato BFF, decisiones de Q-01, Security y Testing.
- **Team Definition of Done (DoD):** Si existe.

Referencias: [HU-01](../../../docs/requirements/user-stories/user-onboarding-mvp-completion.sp.md),
[limites frontend](../../../frontend/README.md) y pregunta [Q-01](../../../docs/requirements/open-questions.md).

## 3) Output

Devuelve solo un documento Markdown con estas secciones:

1. **Summary**
2. **Scope**
   - Dentro del alcance: formulario, revision, validacion y estados de onboarding.
   - Fuera del alcance: KYC real, backend, persistencia, pagos y decisiones no aprobadas.
3. **Supuestos**
4. **Decisiones tecnicas por tomar (pendientes o resueltas)**
5. **Riesgos y mitigaciones**
6. **Criterios de aceptacion (medibles)**
7. **Plan de validacion**
   - Pruebas unitarias de campos/validaciones
   - Pruebas funcionales del recorrido
   - Seguridad: privacidad, limpieza y almacenamiento
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

- Incluir los cuatro campos solicitados: nombre, correo electronico, DNI y numero de celular.
- Proponer DNI como string de ocho digitos ASCII y celular peruano local de nueve digitos que comienza con 9, con `+51` separado, solo como validaciones pendientes de aprobacion del contrato/Q-01.
- Mantener `documentType` fijo en `DNI` si el contrato aprobado lo requiere; no convertir DNI a numero ni quitar ceros iniciales.
- No inventar campos requeridos, pasos KYC, consentimiento, endpoint, eventos analiticos o politica de retencion.
- Usar datos sinteticos; no almacenar PII en `localStorage`, logs, URLs o telemetria.
- No afirmar activacion hasta recibir el estado autoritativo definido por el contrato.

## 5) Validation Rules

El documento de salida es valido si:

- Incluye las nueve secciones de Output y declara como pendientes las decisiones no aprobadas.
- Tiene al menos tres criterios verificables que cubran los cuatro campos, correccion de errores y respuesta del flujo.
- Incluye al menos dos riesgos con mitigaciones concretas.
- En tareas por rol, da al menos tres tareas a Tech Lead, Backend y QA o explica por que no aplican; separa dependencias de implementacion frontend.
- Incluye evidencia concreta, sin afirmar que se ejecutaron pruebas no disponibles.
- No contiene datos personales reales ni supuestos sin declarar.

## 6) Evidence

- Referenciar este archivo versionado y HU-01/CA1-6.
- Adjuntar el documento de salida, checklist del recorrido y resultados reales de pruebas cuando existan.
- Los ejemplos `examples/input.sample.md` y `examples/output.sample.md` quedan pendientes hasta que se creen; no afirmar que existen.
- Tag sugerido: `skill-frontend-onboarding-hu01-v0.1.0`. No crear tags ni commits automaticamente.