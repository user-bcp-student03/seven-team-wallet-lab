# Ledger e integridad de pagos — dependencia de HU-01

## Estado y alcance

Documento de diseño, no implementación ni evidencia de pruebas. HU-01 cubre registro y activación; no crea asientos, fondea cuentas, reserva saldo ni ejecuta transferencias. Que una wallet esté activa no habilita pagos. La transferencia interna entre contactos pertenece a HU-02/HU-04 y solo podrá habilitarse después de implementar y verificar sus controles financieros.

HU-06 y su conciliación diaria quedan diferidas. No se agregan proveedores, callbacks, broker, reversos de HU-05 ni persistencias adicionales. PostgreSQL es la autoridad para operaciones, saldo, ledger, idempotencia y outbox. Meilisearch es una proyección eventual de búsqueda y nunca determina saldo, autorización, resultado definitivo ni existencia de un pago.

Las reglas financieras citadas abajo corresponden a decisiones de laboratorio ya registradas: Q-04, Q-05, Q-07, Q-10 y Q-18. No se presentan como reglas de producción ni como afirmaciones regulatorias. No se proponen nuevas tarifas, ventanas, límites o estados.

## Invariantes verificables

1. **Importes exactos y moneda explícita.** Representar importes con `NUMERIC(...,2)`/`BigDecimal`, moneda `PEN` y validaciones SQL. No usar `float`/`double`. La transferencia admite un importe de S/ 1.00 a S/ 2,000.00. La comisión ITF registrada para el laboratorio es 0.05 % desde S/ 1,000.00 inclusive, calculada en decimal y redondeada a dos decimales con mitad hacia arriba. Se cobra adicionalmente al pagador; para autorizar se requiere saldo suficiente para importe más comisión.
2. **Partida doble por operación y moneda.** Para cada operación contabilizada, la suma de débitos es igual a la suma de créditos en PEN. Sin comisión: débito a la cuenta-wallet del pagador por el importe y crédito a la del destinatario por el mismo importe. Con comisión: débito al pagador por importe más comisión, crédito al destinatario por el importe y crédito a la cuenta contable ITF por la comisión. No se crea un asiento de importe cero.
3. **Asientos inmutables.** Un asiento confirmado no se edita ni se elimina. Una operación fallida o expirada no genera postings. Reversos están fuera del alcance de esta HU y requieren el proceso separado autorizado correspondiente.
4. **Saldo autoritativo en PostgreSQL.** Calcular el saldo disponible con los postings confirmados del ledger SQL bajo el protocolo de bloqueo descrito abajo; nunca autorizar con Meilisearch ni con una proyección eventual. Si se incorpora una lectura SQL materializada, no reemplaza al ledger como fuente de verdad y debe mantenerse en la misma transacción; esta propuesta no la requiere.
5. **Una ejecución por ámbito y clave.** El ámbito registrado es pagador autenticado + UUID de `Idempotency-Key`. La restricción UNIQUE de PostgreSQL sobre ese ámbito serializa solicitudes concurrentes. La idempotencia no depende de memoria, caché o índice de búsqueda.
6. **Fingerprint estable.** Comparar un hash versionado de una representación canónica de los campos semánticos de la solicitud: importe decimal a dos decimales, moneda, destinatario interno normalizado y concepto si forma parte del comando aceptado. No incluir PII en claro ni usar el fingerprint como autorización. Una misma clave con fingerprint distinto devuelve 422 y nunca mueve fondos.
7. **Destino autorizado al confirmar.** Comprobar en PostgreSQL que el destinatario es un contacto del pagador conforme a Q-18. Hacer la comprobación en la misma transacción que la operación, sincronizada con cambios de la relación de contacto; no confiar en un resultado del cliente ni del índice.
8. **No hay reservas.** La decisión registrada Q-05 establece que el pago interno se liquida en una transacción ACID, sin reservas ni liberaciones. La confirmación caducada a los cinco minutos termina como `EXPIRADO` y no mueve fondos. La activación de HU-01 tampoco fondea la wallet; el saldo sintético inicial de Q-10 proviene de un proceso separado de seed con su contrapartida contable.
9. **Atomicidad financiera y outbox.** Para un resultado terminal persistido, confirmar en una sola transacción local la operación y su registro idempotente; cuando es exitoso, también todos los postings; y, para el evento de resultado, su fila outbox. No hay dual write ni llamada externa. El pago no depende del worker.
10. **Reintento no es una nueva orden.** Mismo ámbito, clave y fingerprint devuelve el resultado y la referencia originales sin nuevos postings. Tras la ventana de replay de 24 horas registrada en Q-07, la clave reutilizada se rechaza y jamás inicia otro cobro. La clave y su evidencia se conservan mientras exista el pago.

## Fronteras de transacción y locking propuestos

Una solicitud de confirmación autenticada valida UUID y forma canónica del payload en el adaptador. La transacción PostgreSQL reclama la clave con su restricción UNIQUE por pagador y UUID; la fila idempotente, operación, ledger y outbox comparten la misma frontera de commit. No se confirma una fila `PROCESSING` independiente: el intento en curso permanece sin confirmar y no es visible como estado durable.

Orden de trabajo recomendado, aplicado uniformemente por todos los escritores financieros:

1. Reclamar la clave idempotente dentro de la transacción. Si existe un conflicto, esperar el resultado de la transacción propietaria según el límite registrado en Q-07.
2. Verificar y sincronizar la relación de contacto en PostgreSQL.
3. Bloquear las filas de las cuentas afectadas (pagador, destinatario y cuenta ITF cuando corresponda) en orden estable ascendente de identificador. Los seeds y cualquier otro escritor del ledger deben respetar el mismo orden.
4. Recalcular saldo disponible desde postings confirmados después de obtener los locks; aplicar los límites Q-04 y volver a validar el destino antes de contabilizar.
5. Persistir un único resultado terminal. Si es exitoso, insertar todos los débitos y créditos inmutables. Insertar el evento outbox en la misma transacción y confirmar.

Usar PostgreSQL `READ COMMITTED` con locks de fila y leer el saldo después de adquirirlos, o demostrar una estrategia equivalente que impida leer un saldo obsoleto. Cualquier cambio de aislamiento debe conservar el mismo comportamiento verificable. No capturar una violación UNIQUE y continuar en la transacción abortada: cerrar/revertirla y leer el registro original en una transacción válida. La restricción SQL es autoridad para unicidad; Meilisearch no participa.

La operación se considera confirmada únicamente después del commit. Un timeout del cliente o una desconexión durante el commit no se traduce en fracaso: el cliente consulta el resultado autoritativo o reintenta con la misma clave. El worker entrega outbox con reintentos; su atraso o caída no revierte ni cambia el resultado financiero.

## Estados y respuestas

Los estados terminales registrados en Q-05 son `EXITOSO`, `FALLIDO` y `EXPIRADO`; no se agrega un estado financiero `INCIERTO` ni un estado durable `PROCESSING`.

- `EXITOSO`: referencia persistida y postings balanceados; débito del pagador y créditos al destinatario/ITF en el mismo commit.
- `FALLIDO`: validación de negocio, destinatario no elegible o fondos insuficientes, conforme a Q-05; no crea postings. Para un intento de confirmación aceptado, persistir el resultado idempotente y el evento terminal en PostgreSQL para que el replay reproduzca el resultado original.
- `EXPIRADO`: confirmación vencida según Q-05; no crea postings y el replay reproduce el resultado original.
- Misma clave y payload mientras el primer intento sigue sin commit: la segunda solicitud espera. Si vence el límite Q-07, responde 409 sin tomar posesión de la clave ni declarar fallida la operación original. Ese 409 de espera agotada no es un cuarto estado terminal; el cliente puede consultar/reintentar con la misma clave.
- Misma clave y payload distinto: 422, sin postings. Clave reutilizada después de la ventana de replay: rechazo, sin reejecución. Una intención genuinamente nueva usa una clave nueva; por ello el cliente debe reutilizar la misma clave para dobles clics y reintentos de una misma confirmación.

Una respuesta de éxito o fallo se lee de PostgreSQL. Un resultado ausente en Meilisearch no demuestra que la operación no exista ni autoriza repetirla con una clave nueva.

## Evidencia original/reintento — HU-04 CA4

Persistir evidencia durable vinculada al ámbito/clave, fingerprint versionado, operación y referencia original, con identificadores de intento, fecha UTC y clasificación (original, replay idéntico o conflicto de payload). La evidencia no almacena credenciales ni PII innecesaria, y no se emite a logs, métricas o trazas con la clave, el fingerprint o datos personales.

El original se guarda en la transacción de la operación. Cada replay o conflicto agrega evidencia sin alterar los asientos originales; un replay devuelve la referencia y resultado originales. Si falla la escritura de evidencia, informar el error explícitamente y permitir reintentar con la misma clave; nunca responder como si se hubiera registrado ni volver a ejecutar el efecto financiero. La evidencia es append-only y se conserva mientras exista el pago, según Q-07. Su persistencia no depende de Meilisearch ni del worker.

## Matriz de fallos y recuperación

| Escenario verificable | Efecto durable esperado | Recuperación / evidencia esperada |
| --- | --- | --- |
| Dos solicitudes simultáneas, misma clave y mismo payload | Como máximo una operación y un conjunto de postings; ambos resultados refieren a la misma operación | PostgreSQL serializa por UNIQUE. La segunda espera y devuelve el original; comprobar vínculo original/reintento HU-04 CA4. |
| Dos solicitudes simultáneas, misma clave y payload distinto | Como máximo el payload propietario de la clave puede ejecutarse; el conflictivo no crea postings | Responder 422 al conflicto y registrar evidencia del intento sin cambiar operación o ledger originales. |
| Dos pagos concurrentes, claves distintas, mismo pagador | Cada comando vuelve a evaluar el saldo bajo locks; el saldo no se vuelve negativo | Bloqueo ordenado de cuentas y lectura de postings tras obtener lock. Si el segundo ya no tiene fondos, `FALLIDO` y cero postings. |
| Destinatario no es contacto del pagador | Cero postings | Validación autoritativa de contacto dentro de la transacción; resultado según Q-05 y registro idempotente si el intento de confirmación fue aceptado. |
| Fondos insuficientes, incluido el importe más ITF | Cero postings en todas las cuentas | Persistir `FALLIDO`; replay de la misma clave devuelve ese resultado, aunque luego cambie el saldo. Una intención posterior requiere nueva clave. |
| Crash antes del commit | Cero operación, clave, postings y outbox confirmados por esa transacción | PostgreSQL revierte todo. El reintento con la misma clave puede reclamarla y procesarse como primera ejecución; comprobar que queda como máximo un efecto. |
| Commit completado, respuesta perdida o timeout del cliente | Operación, clave, postings y outbox permanecen confirmados | Reintento con la misma clave encuentra el registro en PostgreSQL, guarda evidencia de replay y devuelve resultado/referencia original sin segundo débito. No inferir fracaso del timeout. |
| Crash durante una transacción que reclama una clave disputada | O se confirma toda la transacción propietaria o no se confirma ningún efecto suyo | El solicitante concurrente continúa tras conocer el commit/rollback; si el primero revirtió, el segundo puede reclamar la clave. No queda clave huérfana ni `PROCESSING` durable. |
| Espera de duplicado supera límite Q-07 | No se altera la operación propietaria ni el ledger | Responder 409 de espera agotada; reintentar/consultar con la misma clave. No tratar 409 ni timeout como resultado financiero terminal. |
| Worker/outbox o Meilisearch indisponible tras el commit | El resultado SQL y los postings no cambian | Outbox queda durable y pendiente de reintento. Lecturas financieras siguen en PostgreSQL; lag, caída y reindexación pertenecen a la proyección HU-02, no a HU-01. |
| Fallo al insertar outbox antes del commit | No se confirma pago ni postings | Rollback completo; reintento con la misma clave. Nunca confirmar un pago con dual write incompleto. |
| Cuenta recién activada en HU-01, sin seed de fondos | Sin postings de pago ni saldo asumido por la activación | No habilitar confirmación por el solo estado `ACTIVE`; el seed Q-10 es un proceso contable separado. |

## Pruebas y evidencia prevista

Los siguientes son oráculos para HU-02/HU-04, no pruebas ejecutadas ni alcance de implementación de HU-01. Usar `backend-tests` contra el PostgreSQL efímero disponible en el entorno autorizado; no sustituirlo por H2, dobles para invariantes financieras ni un motor de contenedores que no esté disponible. Verificar filas y sumas directamente en PostgreSQL. No afirmar prueba de Meilisearch real: ninguna lectura del índice puede decidir estos oráculos.

- Misma clave concurrente y payload igual: una operación, una sola serie de asientos, sumas débito/crédito iguales y evidencia enlazada; ambas respuestas comparten referencia.
- Misma clave con payload diferente: 422, sin nuevos postings, referencia original intacta y evidencia del conflicto.
- Crash/fallo inyectado antes del commit: cero filas confirmadas de operación, clave, postings y outbox; reintento mismo UUID termina como máximo en una operación balanceada.
- Commit con respuesta descartada: reintento mismo UUID devuelve el original sin duplicar asientos.
- Claves distintas concurrentes sobre saldo insuficiente para la suma importe+ITF: serialización, ningún saldo negativo, pago fallido sin postings para la solicitud no financiable.
- Destino ajeno a contactos, confirmación expirada, límites del importe y cálculo/redondeo ITF: resultados de Q-04/Q-05, consistencia del ledger y cero movimientos en los resultados no exitosos.
- Fallo de inserción outbox: rollback de la operación completa; caída del worker después del commit: estado financiero intacto y evento recuperable.
- Pérdida, demora o reconstrucción del índice: resultado, saldo, historial autoritativo e idempotencia consultados desde PostgreSQL permanecen iguales.

## Bloqueo explícito de habilitación financiera

HU-01 puede revisarse sin construir pagos. **No habilitar ni presentar como ejecutable el punto de pago** hasta que HU-02/HU-04 implementen la transferencia interna en una transacción PostgreSQL y verifiquen, como mínimo, doble partida, importes exactos, no saldo negativo bajo concurrencia, unicidad durable, replay/conflicto, rollback pre-commit, outbox atómico y evidencia original/reintento. No hay evidencia de ejecución de esas pruebas en esta definición; el bloqueo es para habilitar pagos, no para completar HU-01. No quedan reglas Q financieras nuevas decididas en este documento.