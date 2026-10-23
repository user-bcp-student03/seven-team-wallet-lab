# Tareas propuestas de orquestacion

Estas casillas representan la aceptacion integral de cada criterio de tarea.
No marcar una completa por un check parcial: la suite offline no acredita
proveedor/modelo, sandbox adversarial ni wallet. El usuario aprobo implementar
el runner; quedan pendientes Q-15/Q-16 y gates operativos. Escenarios S01..S18:
[spec de orquestacion](specs/crewai-orchestration/spec.md). La aprobacion humana
del cambio y Q-15/Q-16 son gates, no tareas que un LLM pueda autoaprobar.

## 1. Autorizar el cambio y cerrar contratos

- [ ] 1.1 Aprobar proposal/specs/design/tasks y resolver Q-15/Q-16; HU-01 CA1-6, HU-02 CA1-6, HU-04 CA1-4; S07/S10/S11; evidencia: decision humana autenticada, versiones, endpoint y presupuestos sin secretos.
- [ ] 1.2 Completar/revisar los cinco perfiles y apoyos aplicables; mismas HU/CA; S04/S05; evidencia: perfiles sin pendientes, revision de skills/YAML y rechazo comprobado de perfiles draft.
- [ ] 1.3 Definir contratos tipados de request/contexto/artefacto/evidencia y revision; mismas HU/CA; S01/S04/S09; evidencia: esquemas y fixtures validos/invalidos ejecutados.

## 2. Implementar definicion: HU a artefactos

- [ ] 2.1 Implementar loader canonico de epica/HU/CA/preguntas con hashes y alcance ordenado; HU-01 CA1-6, HU-02 CA1-6, HU-04 CA1-4; S01/S02/S03; evidencia: originales intactos y pruebas traversal/symlink/reparse/inyeccion.
- [ ] 2.2 Instanciar Agent/Task/Crew con los YAML, perfiles y skills revisados; mismas HU/CA; S04/S05; evidencia: wiring comprobado con dobles sin llamadas a modelos y context completo por dependencia.
- [ ] 2.3 Implementar Flow de definicion y bloqueos por pregunta; mismas HU/CA; S04/S06/S07; evidencia: fixture HU a propuesta/specs/diseno/controles/pruebas/tareas con trazabilidad y politicas faltantes explicitas.
- [ ] 2.4 Implementar writer, manifiesto JSON, aislamiento por run y promocion revisada; mismas HU/CA; S08/S09/S18; evidencia: rechazo de destinos fuera del volumen, escrituras atomicas, concurrencia y ausencia de autoarchivo/commit.
- [x] 2.5 Integrar el adaptador personal Copilot SDK como proveedor optativo de CrewAI; HU-01 CA1-6, HU-02 CA1-6, HU-04 CA1-4; S19/S20/S21; evidencia: pruebas offline de seleccion, rechazo sin Q-15/token, ausencia de tools, sesion efimera y limpieza; sin llamada a modelo real.

## 3. Implementar gates y construccion aislada

- [ ] 3.1 Implementar aprobacion autenticada, revocacion, expiracion y revision completa; mismas HU/CA; S10/S11; evidencia: rechazo sin aprobar, aprobacion forjada, inputs cambiados y permiso expirado antes de efectos.
- [ ] 3.2 Implementar seleccion de tareas OpenSpec, sandbox y adaptador de candidatos/diffs; HU-01 CA1-6, HU-02 CA1-6, HU-04 CA1-4; S12/S16; evidencia: allowlist aplicada, rechazo de HU diferidas y pago sin idempotencia.
- [ ] 3.3 Implementar ejecucion externa de checks en contenedores sin socket/shell libre del agente; HU-01 CA1-3, HU-02 CA1-4, HU-04 CA1-4; S13/S16/S17; evidencia: comandos permitidos/denegados, red/secretos aislados y resultados con hash de snapshot.
- [ ] 3.4 Implementar integracion AI Engineering y revisiones Arquitecto/Security/Testing/PO; HU-01 CA1-6, HU-02 CA1-6, HU-04 CA1-4; S13/S14/S18; evidencia: autores/revisores separados y tareas sin prueba permanecen pendientes.
- [ ] 3.5 Implementar correcciones acotadas, presupuesto y reanudacion segura; mismas HU/CA; S11/S14/S15; evidencia: agotamiento, crash/reinicio y nueva revision de dependientes sin duplicar efectos.

## 4. Verificar entorno y activar por etapas

- [ ] 4.1 Empaquetar runner y checks con versiones fijadas en OCI/Compose Docker/Podman; mismas HU/CA; S16/S17; evidencia: config/build/arranque, permisos/egress reales, sin runtimes de producto host ni persistencias implicitas.
- [ ] 4.2 Ejecutar primero un caso documental autorizado y revisar sus artefactos; mismas HU/CA; S01/S04/S06/S18; evidencia: consentimiento de gasto, paquete real, consumo y revision humana sin afirmar producto construido.
- [ ] 4.3 Autorizar por separado un cambio de producto acotado con sus preguntas cerradas; HU-01 CA1-6, HU-02 CA1-6, HU-04 CA1-4 segun tarea; S07/S11/S12/S13; evidencia: aprobacion versionada, tests reales y gate de idempotencia antes de pagos.
- [ ] 4.4 Activar y probar Copilot personal tras cerrar Q-15; HU-01 CA1-6, HU-02 CA1-6, HU-04 CA1-4; S10/S15/S17/S20/S21; evidencia: autorizacion vigente, prueba con prompt sintetico, modelo/cuenta/presupuesto y egress revisados, sin persistencia de sesion ni secretos en artefactos.