# Roles y acceso

Los usuarios de autenticación están separados de los registros de
participantes. Una cuenta con rol `participant` se vinculará posteriormente con
un registro de `participants`.

| Rol | Acceso base |
| --- | --- |
| `admin` | Administración de usuarios y acceso completo a participantes. |
| `staff` | Crear, actualizar, consultar y registrar el ingreso de participantes. |
| `counselor` | Consultar el directorio de participantes. |
| `participant` | Consultar únicamente su propio espacio y registro vinculado. |

El registro público permanece deshabilitado. Las cuentas nuevas se crean desde
la administración y, si no se especifica un rol, Better Auth asigna
`participant` por seguridad.
