# Asistencia final

En Compañías, cada participante tiene un selector **Asistió: Sí / No**.
Se guarda directamente en `participants.final_attendance` y se muestra en su
perfil. `null` significa que todavía no se ha registrado; no se presume ausencia.
Solo staff y administradores pueden modificarla. Requiere conexión y solo muestra
el cambio como guardado después de recibir la confirmación del servidor.

La asistencia final es independiente del estado de inscripción y de la llegada.
La tabla `participant_attendance` y sus migraciones se conservan como histórico;
sus registros diarios no se convierten automáticamente en asistencia final.

Las rutas antiguas redirigen a Compañías. `public/attendance-sw.js` retira el
service worker anterior y su caché de archivos. No borra IndexedDB ni convierte
registros pendientes del flujo anterior en asistencia final.
