# Asistencia final

En Compañías, cada participante tiene un selector **Asistió: Sí / No**.
Se guarda en `participants.final_attendance` y aparece en su perfil.
`null` significa que todavía no se ha registrado. No modifica la inscripción
ni la llegada, ni convierte los registros diarios históricos.

## Guardado local

- Cada selección se confirma primero en IndexedDB (`confejas-final-attendance-v1`)
  y aparece inmediatamente sin esperar la red. Si falla el almacenamiento local,
  se informa del error y no se muestra como guardada.
- La cola está separada por cuenta y participante. Solo conserva la selección más
  reciente, además de la solicitud exacta en curso hasta confirmar su resultado.
- El dashboard reintenta al abrirse, recuperar conexión, volver a la pestaña y
  cada 15 segundos. Las solicitudes tienen un tiempo límite de 10 segundos.
- Si se cierra el navegador, los pendientes permanecen en el mismo dispositivo;
  se envían al abrir de nuevo el dashboard con la misma cuenta. No se agrega una
  PWA ni se cachean páginas: cargar la app desde cero todavía requiere internet.
- Un aviso distingue lo guardado localmente de lo enviado al servidor. Los
  registros se retiran de la cola solo tras confirmar su revisión en la API.
- El servidor autentica, comprueba el rol, el origen, la cuenta de la cola y la
  compañía actual. Si la sesión caduca o cambia la cuenta, los pendientes no se
  eliminan ni se envían como otro usuario.
- Las revisiones UUID hacen seguros los reintentos y evitan que una solicitud
  atrasada sobrescriba una elección posterior. Si otro dispositivo cambió la
  asistencia, **Revisar** permite conservar el valor del servidor o enviar la
  selección local explícitamente. Si cambió de compañía, se debe actualizar el
  listado y registrar en su compañía actual.

## Validación y despliegue

Aplicar la migración aditiva `0028` antes de desplegar. La acción anterior también
actualiza la revisión para detectar cambios hechos desde pestañas de la versión
anterior. `bun test` cubre persistencia, cuentas, fallos, confirmaciones tardías,
conflictos y permisos; `bun run scripts/check-final-attendance-sync.ts` verifica
las escrituras SQL en tablas temporales sin tocar datos reales.

La tabla diaria `participant_attendance` permanece como histórico. Las rutas
antiguas redirigen a Compañías; `public/attendance-sw.js` retira el worker anterior
sin borrar IndexedDB ni convertir sus pendientes antiguos.
