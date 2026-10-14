# ADR-0023: Invitaciones de inscripción de equipos

- Estado: Aceptada
- Fecha: 2026-10-13
- Relacionado: [ADR-0017](/docs/adr/0017-contextual-capability-authorization.md) · [ADR-0019](/docs/adr/0019-competition-registration-and-applications.md) · [ADR-0008](/docs/adr/0008-notifications-web-and-email.md)
- Extiende: ADR-0019 (un equipo entra por invitación además de por postulación)
- Índice: [Registro de decisiones](/docs/adr/README.md)

## Contexto

Un equipo entra hoy a una competición de dos formas: el staff lo crea y lo inscribe, o un
actor lo postula desde Explorar mientras la inscripción está abierta (ADR-0019). El
organizador no tiene forma de traer a alguien concreto ni de compartir un enlace por
WhatsApp para que un equipo se inscriba.

La invitación de competición que ya existe (`organizations`, rol `captain`) da acceso,
pero no inscribe (DEC-071). Quien la acepta queda como capitán sin equipo. Además, `Team`
pertenece a una organización: no existe un directorio global de equipos al que invitar.

## Decisión

**Agregado `EntryInvitation` en `@futrob/competitions`.** Es una invitación que termina en
una `CompetitionEntry`. Tiene dos canales:

- `directed`: va a un `inviteeActorId` concreto, con un mensaje opcional (máximo 280
  caracteres) y una caducidad de 14 días. Solo el destinatario puede aceptarla o
  rechazarla. Como máximo hay una pendiente por par (competición, invitado).
- `link`: un código aleatorio de 12 caracteres (72 bits), guardado en claro y legible solo
  con `competitions.invitations.manage`. Hay como máximo uno activo por competición.
  Regenerarlo revoca el anterior en la misma transacción. No caduca por tiempo; deja de
  funcionar si se revoca o si la competición sale de `draft`/`registration`.

**A quién se invita.** El canal `directed` invita a un jugador de Futrob, el futuro capitán,
no a un `Team` existente. El organizador lo busca por prefijo de gamertag (mínimo 3
caracteres, máximo 10 resultados). El resultado muestra el club EA que declaró el jugador
(`PlayerExternalClubAssociation`), que sirve como nombre sugerido para el equipo.

**Aceptación.** `EntryInvitationAcceptanceFlow` vive en `apps/api` porque cruza
`competitions` y `teams`. Sigue el mismo orden que `CompetitionApplicationFlow`:

1. Guardas de solo lectura: la invitación es válida para el actor, la competición acepta
   cambios de participantes (`canEditParticipants`), el actor no tiene plantilla en ella y
   queda cupo libre.
2. `CreateApplicantTeam` crea el equipo en la organización anfitriona con el nombre que
   eligió el capitán (`<key>:team`).
3. Se registra la inscripción como `approved` (`<key>:entry`). La invitó el organizador, así
   que no necesita una segunda aprobación. Con el cupo lleno responde
   `competitions.capacity_reached`.
4. `ClaimApplicantCaptaincy`.
5. La invitación dirigida pasa a `accepted` con `acceptedEntryId`. El enlace sigue `pending`
   y admite más equipos.

Todo corre en una transacción. Un reintento con la misma `creationKey` devuelve la misma
inscripción.

**Permisos.** Invitar, listar, revocar, gestionar el enlace y buscar jugadores exigen
`competitions.invitations.manage`, además de la guarda `canEditParticipants`. Aceptar no
exige permisos de organización: como en ADR-0019, el capitán gana acceso por su plantilla en
una inscripción aprobada.

**Actividad.** La invitación dirigida abre una actividad `entry_invitation` para el actor
invitado, que requiere acción, y otra informativa para la organización. Aceptar, rechazar o
revocar la cierra. Se escribe en la transacción del comando, igual que `roster_invitation`.

## Consecuencias

- El paso Participantes ofrece **Invitar equipo** en `draft` y en `registration`.
- DEC-071 sigue vigente: la invitación de acceso y la de inscripción son agregados distintos.
- Cualquier organizador con el permiso puede ver gamertags y clubes declarados. Es la
  exposición mínima que necesita la búsqueda.
- Un enlace filtrado deja entrar equipos aprobados hasta llenar el cupo. El organizador lo
  regenera y quita participantes.
- Sin bloqueo de filas, dos aceptaciones simultáneas pueden superar el cupo por uno, igual
  que en ADR-0019.
- Conectar el club EA del equipo creado queda en el flujo de capitán existente.
- Pendiente: deep link nativo (FTR-MOB-002) y email.

## Alternativas consideradas

- **Ampliar `OrganizationInvitation`.** Mezcla acceso con inscripción y rompe DEC-071.
- **Directorio global de equipos.** Exige una identidad de club entre tenants y contradice
  que `Team` pertenece a una organización.
- **Guardar solo el hash del código.** El organizador no podría volver a copiar el enlace sin
  regenerarlo, y eso invalida lo que ya compartió.
- **Inscripción `pending` para el enlace.** Duplica la decisión del organizador. Si el enlace
  se filtra, basta con regenerarlo.

## Estado de implementación y evidencia

- Dominio y casos de uso en `@futrob/competitions`, y búsqueda de jugadores en `@futrob/teams`.
- Migración `0055_competition_entry_invitations.sql`.
- Rutas `…/entry-invitations`, SDK y BFF. Diálogo **Invitar equipo** y página de aceptación,
  con stories y pruebas de interacción.
