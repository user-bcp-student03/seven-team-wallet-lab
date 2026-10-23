# REGLAS DE NEGOCIO PARA LA SOLUCIÓN

## TECNOLOGIA

- Web
- Web/Responsive

## NAVAGADORES

- Edge
- Google Chrome
- Safari

## ONBOARDING WALLET

Como usuario de smartphone que realiza transferencias diarias de bajo monto,
quiero completar el onboarding de la wallet con un flujo guiado y señales claras de siguiente paso,
para poder empezar a pagar sin abandonar el proceso.

Para realizar el alta del cliente se debe solicitar al usuario los siguientes datos:

- Tipo de Documento (DNI)
- Número de Documento (Campo númerico, longitud máxica de 8 caracteres)
- Número de Celular (Campo númerico del 0-9, longitud máxima de 9 caracteres)
- Correo (Alfanúmerico, sin caracteres especiales, con un dominio válido)
- Contraseña (Alfanúmerico con un máximo de 20 caracteres)

### Consideraciones del Onboarding:

- Si el cliente ya existe debe devolver un mensaje de validación indicando "El cliente ya existe"
- Si el cliente aún no existe luego de completar los campos obligatorios y seleccionar botón Registrar, debe devolver un mensaje de validación indicando "El cliente fue creado con éxito" mostrando la pantalla "Home del Wallet"

## LOGIN (El cliente de estar registrado previamente.)

- Se deben completar los siguientes campos (Tipo de Documento, Número de Documento y Contraseña)
- Si los datos son correctos luego de seleccionar el botón "Ingresar" debe mostrar la pantalla "Home del Wallet"
- Si los datos son incorrectos debe devolver un mensaje de validación indicando "Datos incorrectos"

## REALIZAR PAGO

Como pagador,
quiero completar una transferencia de bajo monto y recibir una confirmación definitiva del resultado,
para confiar en si el pago se realizó o no.

Para realizar un pago se debe tener en cuenta lo siguiente:

- El cliente debe contar con saldo disponible mayor o igual al monto que desea transaccionar.
- Si no existe saldo disponible debe mostrar un mensaje indicando "Fondos insuficientes"
- La moneda de los pagos debe ser en soles.
- El monto mínimo a pagar debe ser 1
- El monto máximo a pagar debe ser 2000
- Luego de realizar el pago se debe actualizar el saldo disponible.
- Luego de realizar el pago se deben mostrar las últimas 10 trasacciones en un vista "Mis movimientos"
- Si se desea consultar mas de 10 movimientos debe exitir una opción "Ver mas movimientos", el cual debe devolver los movimientos de los últimos 90 días de manera incremental, al hacer scroll a la vista.
- Todos los pagos deben estar registrados en una base de datos "payments_history"
- Antes de la confirmación final, la pantalla de pago muestra la identidad del destino y el monto de la transferencia.
- El pagador recibe un único resultado terminal por intento: exitoso, fallido o expirado.
- Si el pago es exitoso, se muestra una referencia de transacción y queda persistida en el historial.
- Para montos mayores iguales a 1000 debe descontarse el ITF (0.05%) según corresponda, el cual debe visualizarse como un movimiento adicional con la glosa ITF.


