# ADR-0006: OpenSpec antes de construccion con CrewAI

- Fecha: 2026-10-23
- Estado: Aceptado para implementar el runner; activacion operativa sujeta a Q-15/Q-16 y gates humanos.
- Referencias activas: HU-01 -> HU-02 -> HU-04; Q-15, Q-16.

## Contexto

Las HU contienen preguntas abiertas. Una orquestacion autonoma no debe convertir
supuestos en politicas financieras ni autorizarse a si misma a construir.

## Decision

OpenSpec spec-driven es la fuente de propuestas, delta specs, diseno y tareas.
CrewAI tendra etapas de refinamiento, diseno, construccion y revision con
aprobaciones humanas entre ellas. Los agentes leen solo el contexto autorizado
del cambio; cada salida debe identificar HU/CA, escenario y evidencia.

El [flujo de especialistas](../../agents/flows/README.md) concreta cinco roles
principales: PO, AI Engineering, Testing, Arquitecto y Security. Ledger, backend,
frontend y plataforma se conservan como apoyos coordinados por el runner, no por
delegacion libre. Los cascarones en agents/specialists/ deben completarse y
revisarse antes de activar cualquier perfil; no sustituyen skills ni tareas.

El runner Python implementa gates persistentes, almacenamiento confinado y
allowlists de artefactos, sin tools/shell para los agentes. Sus pruebas offline
no acreditan seguridad adversarial. No se han realizado llamadas LLM reales ni
ejecuciones de producto. Una instruccion en YAML o `human_input` no es una
frontera de seguridad ni una autenticacion independiente del operador.

La aprobacion debe vincular change ID, hash de artefactos/commit, alcance,
aprobador y fecha. Cualquier cambio material invalida la aprobacion. Revisores
no aprueban su propia implementacion; el responsable humano decide el avance.

El runner CrewAI y los checks se ejecutan en contenedores OCI
compatibles con Docker/Podman Desktop. Un runner no recibe el socket del motor;
el arranque/build de contenedores permanece bajo control externo autorizado.
Los contextos solo incluyen HU activas y preservan el orden HU-01 -> HU-02 -> HU-04,
sin habilitar pagos hasta verificar la proteccion idempotente necesaria.

## Alternativas

Agentes con shell irrestricto aceleran prototipos, pero elevan riesgo de fuga de
secretos y cambios no revisados. Copiar tareas desconectadas de OpenSpec crea
dos backlogs divergentes.

## Consecuencias y verificacion

Mas revision explicita, con trazabilidad y limites de llamadas/tokens/tiempo.
No hay presupuesto monetario duro, autenticacion aparte de la custodia local del
control ni egress restringido en Compose; Q-15 debe resolver estos bloqueos antes
de activar modelos. CrewAI nunca forma parte del procesamiento de pagos en runtime.