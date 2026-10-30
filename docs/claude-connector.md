# Conector de Claude para NEXXO

## Activación

1. Actualizar el código y las dependencias en la VPS, compilar y reiniciar la aplicación con el procedimiento habitual. Las migraciones se ejecutan al arrancar.
2. Confirmar que el subdominio de la empresa sirve HTTPS con certificado válido.
3. En los conectores personalizados de Claude, agregar la URL del subdominio de la empresa con la ruta `/mcp`.
4. Cada persona debe iniciar sesión con su propia cuenta de NEXXO y autorizar los permisos.
5. Marcar los permisos adicionales de correo y programación de seguimientos únicamente si se quieren habilitar.

No se comparten las contraseñas de NEXXO con Claude. El conector utiliza autorización OAuth por usuario y empresa.

## Acciones

- `buscar_clientes`: busca clientes visibles para el usuario.
- `buscar_checkins`: consulta seguimientos abiertos y sus contactos recientes.
- `registrar_contacto`: registra llamada, visita o videollamada con acuerdos, compromiso del cliente y notas internas.
- La misma acción puede solicitar correo de la minuta y/o programar una visita futura con fecha, hora y zona horaria explícitas.

Ejemplo:

> Busca al cliente y registra una llamada: acordamos enviar la cotización y se comprometió a responder el viernes. No envíes correo. Programa seguimiento el 6 de noviembre de 2026 a las 10:00, hora de Monterrey.

Claude debe resolver el cliente antes de registrar el contacto. Cuando hay varios seguimientos abiertos, debe pedir cuál utilizar. Los vendedores solo acceden a sus registros asignados. Registrar un contacto no cierra el seguimiento.

Los correos utilizan los destinatarios configurados del cliente y el personal activo de la misma empresa que acepta notificaciones; no se admiten direcciones arbitrarias. Las notas internas no se incluyen en el correo. Los fallos de correo se informan y no generan reenvíos automáticos.

## Verificación

Se verificaron tipos, pruebas automatizadas, compilación, metadatos OAuth, rechazo de solicitudes sin token, registro de cliente OAuth y redirección a inicio de sesión. Falta la prueba completa con una cuenta real de Claude después de instalarlo en la VPS. La interfaz de consentimiento autenticada no se verificó visualmente.
