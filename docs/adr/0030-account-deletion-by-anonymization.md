# ADR-0030: Eliminación de cuenta por anonimización

- Estado: Aceptada
- Fecha: 2026-11-10
- Relacionado: [ADR-0011](/docs/adr/0011-tagged-errors.md) · [ADR-0013](/docs/adr/0013-ea-egress-api-only.md) · [ADR-0015](/docs/adr/0015-auth-worker.md) · [ADR-0021](/docs/adr/0021-auth-and-actors-in-product-postgres.md)
- Índice: [Registro de decisiones](/docs/adr/README.md)

## Contexto

Apple y Google exigen que la app permita eliminar la cuenta desde dentro. En el Postgres de
producto, 43 columnas referencian `actors (id)` con `ON DELETE RESTRICT`: resultados
oficiales, auditoría, selecciones, disputas, invitaciones y actividad. Borrar la fila del
actor rompería esa historia o fallaría. Solo `identity_subjects`, `actor_contact_profiles`
y `actor_preferences` cascadean.

## Decisión

Eliminar una cuenta es **anonimizarla**. La fila de `actors` queda como lápida y desaparece
todo lo que identifica a la persona.

### Ciclo de vida

`actors` gana `deletion_requested_at`, `deletion_scheduled_for` y `deleted_at` (migración
`0067`, tras la `0066` de MAIL-01). El estado es `active`, `scheduled` o `deleted` (`AccountDeletionState` en
`@futrob/identity`).

| Caso de uso              | Efecto                                                                                                                                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RequestAccountDeletion` | Verifica la contraseña, comprueba bloqueos, programa la eliminación a 30 días (`ACCOUNT_DELETION_GRACE_DAYS`, configurable al componer) y cierra todas las sesiones. Repetirlo conserva la fecha original. |
| `CancelAccountDeletion`  | Durante el plazo, limpia las fechas. La cuenta queda como estaba.                                                                                                                                          |
| `ExecuteAccountDeletion` | Job: por cada cuenta vencida, en una transacción, borra `auth_users` (cascadea sesiones y cuentas), `identity_subjects` y `actor_contact_profiles`, marca `deleted_at` y publica `identity.actor-deleted`. |

El vencimiento se calcula con `ClockPort`. El job lo dispara el Cron del Worker web contra
`POST /internal/identity/account-deletion/run` en `apps/api`.

### Reautenticación

La contraseña viaja en `POST /identity/account/deletion` y la verifica el API de producto
contra el hash de `auth_accounts` (`CredentialVerifierPort`), con el verificador de Better
Auth. Así la comprobación vive en un único punto para web, móvil y CLI, y una sesión robada
no basta para eliminar la cuenta.

### Limpieza por contexto

Cada contexto limpia lo suyo al recibir `identity.actor-deleted`; identity no toca tablas
ajenas. El outbox aún no está conectado (ver [overview](/docs/architecture/overview.md)), así
que `apps/api/src/di/` entrega el evento en proceso a los manejadores de cada contexto,
**dentro de la misma transacción** que la anonimización. Si un manejador falla, la cuenta
sigue programada y la siguiente ejecución lo reintenta. Cada manejador es idempotente.

| Contexto      | Borra o retira                                                                                                                                                   | Conserva                                                               |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| identity      | credenciales, sesiones, sujeto, perfil de contacto, preferencias                                                                                                 | fila `actors`                                                          |
| teams         | cuentas de juego, club EA del jugador, plantillas en competiciones no finalizadas, invitaciones pendientes, equipo activo; marca `player_profiles.anonymized_at` | perfil de jugador como lápida, plantillas de competiciones finalizadas |
| organizations | membresías y permisos concedidos al actor                                                                                                                        | permisos que el actor concedió a otros                                 |
| statistics    | `player_personal_stats`                                                                                                                                          | estadísticas oficiales de competición, sin nombre                      |
| notifications | cierra la actividad dirigida al actor; omite el correo pendiente, retira dirección, nombre y cuerpo de los correos guardados y las preferencias de correo        | actividad del resto; filas del outbox sin datos del destinatario       |

`player_match_contributions.game_account_id` pasa a `ON DELETE SET NULL` para que borrar las
cuentas de juego no choque con estadísticas ya proyectadas.

### Lecturas

Donde aparece un actor eliminado (plantillas históricas, auditoría), el nombre es «Cuenta
eliminada» y no se devuelve ni correo ni identificador de juego.

### Bloqueos

Antes de programar, y de nuevo al ejecutar, se comprueban dos bloqueos y se devuelven como
`AccountDeletionBlocked` (`identity.account_deletion_blocked`, HTTP 409) con la lista en
`details.blockers`:

- Único organizador de una organización con competiciones activas: transferir el rol o
  archivar.
- Capitán de un equipo en una competición activa: ceder la capitanía.

Si un bloqueo aparece durante el plazo, el job **pospone** esa cuenta: sigue programada y se
reintenta en cada ejecución. No se resuelve de forma automática, porque transferir o archivar
afecta a otras personas.

### Periodo de gracia

Al iniciar sesión con una eliminación programada, web y móvil muestran solo la fecha y
«Cancelar eliminación». Para los demás la cuenta sigue visible sin cambios hasta el
vencimiento. La restricción vive en los clientes; el API no bloquea otras operaciones del
actor durante el plazo.

## Consecuencias

- Tras el vencimiento no se puede iniciar sesión: no hay usuario de Better Auth. Las sesiones
  dejan de valer de inmediato en cookie y Bearer, y el correo queda libre para registrarse
  de nuevo, con un actor nuevo.
- Resultados oficiales y auditoría siguen íntegros: conservan el `ActorId` de la lápida.
- Los datos de proveedor (`provider_matches`, `player_match_contributions.display_name`) se
  conservan: son datos del partido publicados por EA, no de la cuenta, y no se devuelven
  asociados al actor eliminado.

## Pendiente

- Correo al solicitar y recordatorio antes de ejecutar dependen de MAIL-01. El cambio de
  correo usa un puerto de envío con un adaptador de desarrollo que registra el enlace; sin
  proveedor configurado, el cambio de correo queda desactivado.
- Página pública para solicitar la eliminación sin instalar la app (Google Play) y texto de
  la política de privacidad (LEGAL-01).
