# Asistencia instalable y sin conexión

La ruta `/asistencia` contiene una interfaz pública estática; la API requiere una sesión de staff o administrador. `/dashboard/attendance` conserva los enlaces anteriores redirigiendo a esa interfaz.

## Uso

1. Abrir **Asistencia** con internet e iniciar sesión. Esperar **Lista disponible sin conexión** y comprobar los **Días guardados**. Se descargan todas las compañías del día seleccionado y de los días de la conferencia; seleccionar otro día con internet también lo prepara.
2. Instalar desde el menú del navegador en Android, o Safari → Compartir → Agregar a inicio en iPhone. El botón **Instalar app** aparece cuando el navegador ofrece esa opción.
3. Marcar asistencia sin conexión. Cada cambio queda en IndexedDB antes de mostrarse como guardado. La cantidad de pendientes se mantiene después de recargar o cerrar la app.
4. Al recuperar conexión, la app sincroniza al abrirse, volver al primer plano y cada 30 segundos mientras está visible. **Sincronizar ahora** permite reintentar. Background Sync complementa este flujo donde el navegador lo admite; no se garantiza ejecución con la app cerrada, especialmente en iPhone.
5. Si otra persona cambió el mismo registro, revisar **Conservar servidor** o **Conservar mi cambio**. Si el participante cambió de compañía o fue eliminado, no se aplica un cambio a la compañía anterior.

No borrar los datos del navegador ni desinstalar la app mientras existan pendientes. El navegador puede denegar almacenamiento persistente; se solicita mediante `navigator.storage.persist()` sin exigirlo para trabajar.

## Persistencia y cuentas

- La base IndexedDB `confejas-attendance-v1` separa listas y cola por usuario y fecha.
- Las operaciones tienen ID estable y revisión esperada. El servidor valida identidad, rol, origen, fecha y pertenencia a la compañía. Una escritura concurrente genera conflicto; repetir una operación confirmada no la vuelve a escribir.
- Una transacción local confirma la respuesta del servidor, actualiza la lista y elimina únicamente esa operación. Los cambios nuevos permanecen en cola.
- Una concesión temporal en IndexedDB serializa los envíos entre pestañas y service workers; vence si el navegador se cierra durante un envío.
- Cerrar sesión bloquea los datos locales sin borrar pendientes. Se recuperan al iniciar sesión con la cuenta original. Nunca se envían como si pertenecieran a otra cuenta.
- No se almacenan cookies, contraseñas ni fichas médicas en la caché de la PWA. La lista mínima contiene nombres, barrio, compañía, asistencia y revisión.

## Compilación y validación

`bun run build` ejecuta Next.js y genera `public/attendance-shell.html` y `public/attendance-sw.js`. Son artefactos ignorados por Git. La interfaz se obtiene de la página estática compilada y el worker precarga los archivos de esa compilación, íconos y manifiesto. Nunca cachea respuestas de autenticación, APIs o páginas privadas. La actualización espera al cierre de las pestañas anteriores; IndexedDB es independiente de la caché de archivos.

El worker se registra solo en producción. Para verificar sin conexión: `bun run build`, `bun run start`, abrir `/asistencia`, esperar a que esté preparada, detener el servidor, recargar y guardar cambios. Al reiniciarlo, verificar la sincronización y su persistencia en PostgreSQL.

- `bun test`: validación, aislamiento de cuentas, persistencia y orden de operaciones, reintentos, conflictos, permisos de API y concurrencia local.
- `bun run scripts/check-attendance.ts`: compatibilidad con el registro original.
- `bun run scripts/check-offline-attendance.ts`: migración y escrituras con revisión en tablas PostgreSQL temporales, sin editar participantes reales.
- Migración `0026_common_guardsmen.sql`: revisión UUID para asistencia existente y nueva. Aplicar antes de publicar el código.
