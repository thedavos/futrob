# Sanctions

An organizer or competition staff records sanctions on a Team or a player (warning, point deduction, suspension, administrative defeat) and revokes them with a reason; sanctions are never deleted (ADR-0028). The affected Team reads its own on `Mi equipo`. A point deduction moves the standings; revoking it restores them.

## Sub-features

- `sanctions-list` is the `Sanciones` page: table `Sanciones de la competición` with `Sanción`, `Sancionado`, `Motivo`, `Impuesta`, `Estado` (`Vigente` / `Revocada` with date and reason). Empty: `Sin sanciones`. Refusal: `Sanciones no disponibles`.
- `sanctions-impose` is the header button `Sancionar` (only with `competitions.sanctions.manage`): dialog `Nueva sanción` with `A quién`, `Tipo`, `Equipo`, `Jugador`, `Puntos a descontar` / `Partidos de suspensión` / `Partido`, `Motivo`, `Registrar sanción`.
- `sanctions-revoke` is `Revocar` on an active row: dialog `Revocar sanción` with `Motivo`. The row stays as `Revocada`; a revoked row has no `Revocar`.
- `sanctions-team` is the `Sanciones` section under the roster on `Mi equipo` and `Plantilla` (org and player routes): read-only table `Sanciones del equipo`, or `Tu equipo no tiene sanciones en esta competición.`
- `sanctions-standings` is a point deduction lowering `Pts` on `Clasificación`, and revoking it restoring them.
- `sanctions-activity` is the activity feed lines `El organizador impuso una sanción` / `El organizador revocó una sanción` for the organization and the affected Team. They open `Sanciones` for the organization and `Mi equipo` for the Team.

## How to get to it (user POV)

- Operator: competition sidebar `Sanciones`, or `/orgs/$orgId/competitions/$competitionId/sanctions`. The item needs `competitions.sanctions.read` (organizer, organization staff, competition staff).
- Team: competition sidebar `Mi equipo`, `/orgs/$orgId/competitions/$competitionId/team` or `/player/competitions/$competitionId/team`, and their `/roster` destinations for captains.
- BFF under `/api/v1/organizations/$organizationId/competitions/$competitionId`: `GET`/`POST sanctions`, `POST sanctions/$sanctionId/revoke`, `GET teams/$teamId/sanctions`.
- CLI: `sanction-list`, `sanctions-smoke`.

## Driving it with verify-futrob

Preconditions:

- `helpers/verify-futrob doctor` exits 0, on Postgres (`DATABASE_URL`).
- A signed-in organizer whose actor id is known, a published competition with at least two approved Teams, and a second actor outside the organization.
- `FUTROB_INTERNAL_JOB_SECRET` equal to `apps/api/.env`.

Steps:

1. **API twin.** `npm run cli -- sanctions-smoke <orgId> <compId> <teamId> --outsider <actorId> --actor <organizer>`. Exit 0 with every check `✓`: outsider 403 on impose and revoke, `PTS` drops by 3 and returns.
2. **Empty.** Open `Sanciones` on a competition without sanctions: `Sin sanciones`.
3. **Impose.** Choose `Sancionar`. Submit empty: read `Elige el equipo.` and `Escribe un motivo de al menos 3 caracteres.`. Choose `Descuento de puntos`, a Team, `Puntos a descontar` 1.9 and a reason: submitting shows `Escribe un número entero entre 1 y 100.` without recording it. Replace with 2 and choose `Registrar sanción`. The row reads `−2 puntos` and `Vigente`. Read it back with `npm run cli -- sanction-list <orgId> <compId>`.
4. **Standings.** Open `Clasificación`: the Team's `Pts` is 2 lower than before (with no matches it is `-2`).
5. **Player sanction.** `A quién` = `Jugador`: `Tipo` only offers `Advertencia` and `Suspensión`.
6. **Revoke.** Choose `Revocar` on the row, write a reason, `Revocar sanción`. The row reads `Revocada` with date and reason and has no `Revocar`. `Clasificación` is back.
7. **Team view.** As a roster player of that Team, open `Mi equipo`: section `Sanciones` lists both, without buttons. A player of another Team does not see them.
8. **Permissions.** As a roster player, the sidebar has no `Sanciones`; opening the URL shows `Sanciones no disponibles`. Manual POSTs to the BFF answer 403.
9. **Activity.** Follow each sanction feed entry as the organizer to `Sanciones` and as the affected Team to `Mi equipo`.

Proof: ARIA snapshot and screenshot per step, the CLI transcripts with exit codes, and the actor used.

## Gotchas

- `draft` and `archived` competitions refuse impose and revoke with `En el estado actual de la competición no se pueden registrar ni revocar sanciones.`
- Suspensions and administrative defeats change no result and no table row. They are records only, by decision (ADR-0028).
- The table stores `pointsDeducted`; a snapshot written before migration 0066 reads 0 until the next rebuild.
- Email for sanctions is not built (MAIL-01). Only the activity feed is.
