# ADR-0019: Inscripciones abiertas y postulación de equipos

- Estado: Aceptada
- Fecha: 2026-09-27
- Actualizada: 2026-11-25
- Relacionado: [ADR-0017](/docs/adr/0017-contextual-capability-authorization.md) · [ADR-0018](/docs/adr/0018-authenticated-competition-discovery.md)
- Reemplaza en parte: la consecuencia de ADR-0018 «la inscripción por cuenta propia sigue fuera de alcance»
- Índice: [Registro de decisiones](/docs/adr/README.md)

## Contexto

Hasta ahora solo el staff inscribía equipos, y solo en `draft`. Una competición
no podía anunciar que buscaba equipos ni recibir solicitudes: Explorar mostraba
competiciones ya en curso. Un capitán de otra organización tampoco tenía un
`Team` en el tenant anfitrión con el cual inscribirse.

## Decisión

**Estado `registration`.** El ciclo pasa a
`draft → registration → published → paused → finished → archived`.

- `OpenCompetitionRegistration` (permiso `competitions.publish`) solo parte de
  `draft` y exige reglas válidas para el formato. No exige participantes.
- En `registration` el formato, las reglas y la identidad quedan congelados
  (`UpdateCompetitionDraft` responde `competitions.not_editable`). Los
  participantes siguen editables: la política `canEditParticipants` admite
  `draft` y `registration`.
- `CloseCompetitionRegistration` vuelve a `draft` y conserva las inscripciones.
- `PublishCompetition` acepta `draft` o `registration` y mantiene el mínimo de
  dos equipos aprobados.
- `registration` es descubrible (`DISCOVERABLE_COMPETITION_STATUSES`).
- Las transiciones usan `CompetitionRepository.changeStatus` como
  compare-and-set sobre el estado leído.

**Postulación por cuenta propia.** Un actor autenticado postula un equipo nuevo
desde Explorar (`POST /competitions/explore/:competitionId/application`). El
flujo vive en `apps/api` (`CompetitionApplicationFlow`) porque cruza
`competitions` y `teams`:

1. Guardas de solo lectura: descubrible, en `registration` y el actor sin
   plantilla en esa competición.
2. `CreateApplicantTeam` crea el `Team` en la organización anfitriona.
3. `ApplyToCompetition` registra la `CompetitionEntry` en `pending`.
4. `ClaimApplicantCaptaincy` añade al actor como capitán de la plantilla. La
   entrada `pending` ya admite escrituras de plantilla.

Cada paso es idempotente con la `creationKey` del cliente
(`<key>:team`, `<key>:entry`), y el flujo corre dentro de la transacción de la
API. Un reintento con la misma clave devuelve la misma solicitud; otra clave
para un actor ya inscrito responde `teams.roster_competition_conflict`.

Los casos de uso de `teams` omiten `teams.create` y `teams.roster.manage`
porque el actor aún no pertenece al tenant. Solo el flujo de postulación debe
invocarlos, después de comprobar que la competición está en `registration`.

El organizador aprueba o rechaza con el flujo existente. No hace falta una
`CompetitionMembership` nueva: con la entrada `approved`, la plantilla del
capitán ya concede acceso (ADR-0017). La solicitud del actor se deriva de su
plantilla (`GET …/application`), sin columna nueva en `competition_entries`.

**Plantilla de una inscripción rechazada.** Rechazar es terminal: aprobar y rechazar
solo parten de `pending`, y volver a postular queda fuera de alcance. Por eso, con la
`CompetitionEntry` en `rejected` la plantilla es de solo lectura para todos, staff
incluido. `RosterEntryGatePort.canMutateRoster` solo acepta `pending` o `approved`, y
cada escritura de plantilla lo consulta antes de mutar:

| Operación en una inscripción `rejected`     | Resultado                                |
| ------------------------------------------- | ---------------------------------------- |
| Leer plantilla, estado y miembros           | Permitido (según `EffectiveAccess`)      |
| Añadir miembro, unirse o aceptar invitación | Bloqueado: `teams.roster_entry_inactive` |
| Crear invitación                            | Bloqueado: `teams.roster_entry_inactive` |
| Abrir o cerrar la plantilla                 | Bloqueado: `teams.roster_entry_inactive` |
| Cambiar el rol de un miembro                | Bloqueado: `teams.roster_entry_inactive` |

El rechazo toma la misma exclusión por competición que las escrituras de plantilla
(`RosterMutationPort`, advisory lock en Postgres) y la mantiene hasta su commit. Una
escritura que ya leyó `pending` se confirma antes que el rechazo; las posteriores leen
`rejected`. Solo hace cola una solicitud con `participants.manage` sobre una inscripción
de esa competición; las demás reciben su error tipado sin esperar el bloqueo. Crear una
invitación no toma esa exclusión: una creada en paralelo al
rechazo queda inservible, porque aceptarla vuelve a pasar por el gate bajo el lock.

El error es un conflicto de estado (HTTP 409), no una denegación de permisos: el staff
conserva sus permisos heredados (ADR-0017), pero el estado de la inscripción impide la
escritura. Cerrar la plantilla para «congelarla» no aporta nada, porque ya no admite
ningún cambio. Web (consola de staff y vista de capitán) y móvil usan `isRosterWritable`
de `@futrob/sdk` para ocultar esas acciones. Si en el futuro se permite reabrir o volver
a postular, esa decisión deberá revisar esta regla.

**Cupo y fecha de inicio.** Reemplazado por `teams` y `schedule` en
[ADR-0020](/docs/adr/0020-competition-profile-and-media.md). El organizador declara
un cupo (2–256, opcional) y fechas (`YYYY-MM-DD` en la zona horaria de la
competición, opcionales). Ambos se editan solo en `draft`. El cupo cuenta solo inscripciones
`approved`: con el cupo lleno, aprobar, registrar como aprobado o postular responde
`competitions.capacity_reached` (409). Las solicitudes `pending` no consumen cupo.
Bajar el cupo por debajo de los aprobados responde `competitions.invalid_capacity`.

## Consecuencias

- Explorar filtra y etiqueta «Inscripciones abiertas».
- El organizador abre y cierra inscripciones desde la configuración.
- Un actor solo puede tener un equipo por competición.
- Las solicitudes nuevas generan actividad web pendiente para el organizador.
  Aprobar o rechazar cierra esa actividad y registra la decisión para la organización
  y el equipo solicitante, dentro de la misma transacción. No requiere consumidor
  de eventos. Email y outbox siguen pendientes en MAIL-01, según
  [ADR-0008](/docs/adr/0008-notifications-web-and-email.md).
- El control de cupo no bloquea filas: dos aprobaciones simultáneas podrían
  superarlo por uno.
- Fuera de alcance: fecha de cierre automática y volver a postular después de un
  rechazo.
- Una plantilla rechazada queda congelada tal como estaba al rechazar; el staff no puede
  prepararla ni corregir sus roles.

## Alternativas consideradas

- **Solo un estado visible, sin postulación.** No agrega una acción nueva.
- **Columna `applied_by_actor_id` en la entrada.** Duplica la plantilla, que ya
  identifica al capitán.
- **Conceder membresía de organización al postular.** Da acceso al tenant antes
  de la aprobación.

## Estado de implementación y evidencia

- Dominio y casos de uso en `@futrob/competitions` y `@futrob/teams`.
- Migraciones `0039_competition_registration_status.sql` y
  `0040_competition_capacity_and_start.sql`.
- Rutas `registration/open|close` y `explore/:id/application`, SDK y CLI
  (`comp-registration-open|close`, `comp-apply`, `comp-application`).
- Tests de dominio, API (`competitions.test.ts`), SDK y stories de Explorar.
- Plantilla rechazada: `team-roster.use-cases.test.ts` (`@futrob/teams`), orden frente a
  una escritura en curso en `competition-entry-activity.test.ts`, regresión HTTP
  en `apps/api/src/http/routes/teams.test.ts` y story `RejectedEntry` de la consola de
  equipos.

La verificación [FEED-01](/.agents/skills/verify-futrob/evidence/feed-01-2026-11-10/NOTES.md)
comprueba aprobación, rechazo, cierre de actividad y reintentos en Postgres local aislado.
Incluye una regresión HTTP para el rechazo persistido y lectura posterior del solicitante.
