# Maqueta funcional: onboarding, login y pagos (prototipo)

Prototipo Angular con el flujo de `docs/BUSSINESS_RULES.md`: onboarding guiado, login, Home del
Wallet, pago a un contacto y "Mis movimientos". **No es el producto**: dinero ficticio, sin
backend, sin autenticacion real y con una base de datos simulada en `localStorage`
(`kipu_mock_db_v1`, tablas `users` y `payments_history`). No es evidencia de comportamiento
financiero ni cierra preguntas abiertas.

## Reglas implementadas

| Area | Regla |
| --- | --- |
| Onboarding | 3 pasos (Documento, Contacto, Seguridad) con indicador de paso y "Despues: ..."; boton **Registrar** al final |
| Campos | DNI numerico max. 8; celular numerico max. 9; correo alfanumerico sin especiales con dominio valido; clave alfanumerica max. 20 |
| Cliente existente | Mensaje "El cliente ya existe" (se compara tipo y numero de documento) |
| Cliente nuevo | Toast "El cliente fue creado con exito" y Home del Wallet |
| Login | Tipo de documento, numero y clave; "Datos incorrectos" si no coinciden |
| Pago | Soles; minimo S/ 1 y maximo S/ 2,000; "Fondos insuficientes"; saldo actualizado tras pagar |
| Confirmacion | Muestra identidad del destino y monto; un unico resultado terminal por intento: exitoso, fallido o expirado |
| Exito | Referencia `TX-XXXX-XXXX` persistida en `payments_history` |
| Movimientos | Ultimas 10; "Ver mas movimientos" carga los ultimos 90 dias de 10 en 10 al hacer scroll |
| ITF | Desde S/ 1,000 se descuenta 0.05% como movimiento adicional con glosa "ITF" (linea final de `BUSSINESS_RULES.md`) |

Supuestos sin definir en las reglas (pendientes de validar con negocio): longitud minima de documento,
celular y clave; el ITF se redondea al centimo mas cercano; los intentos fallidos/expirados tambien se
registran en `payments_history` (sin referencia y sin debito); el ITF cuenta como un movimiento mas en
el limite de 10.

Seguridad del mock: las claves se guardan como SHA-256 con sal (el producto debe usar Argon2id), la
sesion vive solo en memoria y no se guardan tokens en el navegador. Los importes son enteros en centimos.

## Ejecutar en local

Con contenedor (Podman o Docker; sin Node en el host):

```powershell
cd frontend/prototype-wallet-mvp
podman compose up -d --build     # o: docker compose up -d --build
# abrir http://127.0.0.1:4300
podman compose down
```

Con Node del host (solo para desarrollo del prototipo):

```powershell
cd frontend/prototype-wallet-mvp
npm ci
npx ng serve --port 4300
npm test -- --watch=false
```

`compose.yaml` publica solo en `127.0.0.1:4300`. Para abrirlo en la LAN en Windows con Podman hace
falta un reenvio de puerto y una regla de firewall (ver el README de `../prototype-hu02`).

## Simulador (panel lateral)

- Resultado del proximo pago: exitoso, fallido o expirado.
- Generar historial de ejemplo (45 pagos, 5 de ellos fuera de los 90 dias; no altera el saldo).
- Recargar S/ 1,000 (demo) y borrar la base de datos.
- Vista de los ultimos registros de `payments_history`.

## Estructura

- `src/app/core/`: `money.ts`, `sha256.ts`, `validators.ts`, `db.service.ts`, `auth.service.ts`, `payment.service.ts`.
- `src/app/pages/`: login, registro guiado, home, pago y movimientos.
- `src/app/shell/`: panel del simulador.
- `Dockerfile`, `nginx.conf`, `compose.yaml`: imagen estatica sin privilegios.
