# Swiss format

An organizer on Pro or Liga runs a Swiss competition: rounds pair themselves after official results, and the organizer can withdraw a Team or close the current round without a result. The surfaces are the setup wizard, the competition calendar and the standings. There are no public portal routes, so public standings are API-only (ADR-0024).

## Sub-features

- `swiss-setup` chooses `Sistema suizo` in setup step `format`: no `Vueltas` control, only the regular stage in `rules`, estimate `⌈log₂ n⌉` rounds of `⌊n/2⌋` encounters.
- `swiss-upsell` is a Free organization choosing Swiss: 402 `competitions.format_not_in_plan`, a warning with `Ver plan y uso` on create and on the setup page.
- `swiss-generate` is the form `Genera el calendario` on the calendar page of a published Swiss competition without a fixture, for actors with `encounters.schedule.manage`.
- `swiss-rows` covers heading `Fase suiza`, rounds named `Ronda N`, the summary `Rondas emparejadas: X de Y`, an unpaired round (`Se empareja cuando se oficialice la ronda N`, `Fecha prevista: …`), a bye (`{equipo} descansa`) and a closed encounter (`No disputado`). Neither of the last two is a link.
- `swiss-withdraw` covers `Retirar equipo`: dialog with `Equipo`, `Motivo`, `Confirmar retirada`.
- `swiss-close` covers `Cerrar ronda sin resultado`: dialog with `Motivo`, `Confirmar cierre`.
- `swiss-standings` covers `Ronda X de Y`, the `Buch.` column titled `Buchholz: suma de los puntos de los rivales`, `N descanso(s)`, `Retirado`, the caption `Empates: primero Buchholz…` and `Clasificación final`.

## How to get to it (user POV)

- Setup: `/orgs/$orgId/competitions/new` (`Formato`: `Sistema suizo`) or `/orgs/$orgId/competitions/$competitionId/setup?step=format`.
- Calendar: competition sidebar `Calendario`, or `/orgs/$orgId/competitions/$competitionId/fixture`.
- Standings: competition sidebar `Clasificación`, or `/orgs/$orgId/competitions/$competitionId/standings`.
- BFF, all POST under `/api/v1/organizations/$organizationId/competitions/$competitionId`: `fixture`, `fixtures/$fixturePlanId/swiss/withdrawals`, `fixtures/$fixturePlanId/swiss/rounds/$roundNumber/close`.

## Driving it with verify-futrob

Preconditions:

- `helpers/verify-futrob doctor` exits 0, on Postgres (`DATABASE_URL`).
- Signed-in organizer whose actor id is known, and a superuser actor to assign Pro.
- `FUTROB_INTERNAL_JOB_SECRET` equal to `apps/api/.env`.

Steps:

1. **Upsell.** On a Free organization, create a draft with `Formato` = `Sistema suizo`, choose `Crear competición`. Snapshot the warning and `Ver plan y uso`. Then, on a league draft in `?step=format`, choose `Sistema suizo`, accept the confirmation, and choose `Continuar`: the same warning appears, not `No se pudo completar la operación`.
2. **Setup.** `npm run cli -- org-plan-assign <orgId> pro --reason "verify" --actor <superuser>`. Create a Swiss draft. In `?step=format`, read `Sistema suizo`, no `Vueltas` choice, and with 8 `Equipos previstos` read `Rondas` 3 and `Enfrentamientos` 12. In `?step=rules`, read `Buchholz` second among `Criterios de desempate`.
3. **Generate.** Add five approved Teams with `team-create` and `entry-register` / `entry-approve`, then publish. Open the calendar. Read `Recomendadas: 3. Máximo: 3.`. Submit empty: read `Indica una fecha y hora futuras.`. Fill `Inicio de la ronda 1`, keep `Días entre rondas` 7 and `Número de rondas` 3, choose `Generar calendario`. Read `Calendario generado.`, `Rondas emparejadas: 1 de 3` and one `{equipo} descansa`. Read it back with `npm run cli -- fixture-current <orgId> <compId>`.
4. **Rows.** Confirm the rest row is not a link and `Ronda 2` reads `Se empareja cuando se oficialice la ronda 1`.
5. **Withdraw.** On `Ronda 1`, choose `Retirar equipo`. Submit empty: read `Selecciona el equipo.` and `Escribe el motivo.`. Select a Team with a match, write a reason, choose `Confirmar retirada`. Read `{equipo} queda retirado.`, `Retirados: {equipo}` and a new `{rival} descansa`. Read back `withdrawnTeamIds` with `fixture-current`.
6. **Close.** Choose `Cerrar ronda sin resultado`, read the consequences, write a reason, choose `Confirmar cierre`. Read `Ronda 1 cerrada sin resultado.`, `No disputado` on the open rows and a paired `Ronda 2`. Read back `closedWithoutResult` with `fixture-current`. The closed encounters must be gone from `Enfrentamientos`.
7. **Standings.** Approve one result in `Ronda 2` through `results-match-center`, then open `Clasificación`. Read `Ronda 2 de 3`, the `Buch.` column, `1 descanso` and `Retirado`. Settle every round (approve or close) and read `Clasificación final`. Confirm at a 360 px viewport that `Pts` stays visible and the page does not scroll sideways.
8. **Permissions.** As a roster player, open the calendar: no `Retirar equipo`, no `Cerrar ronda sin resultado`, no generate form. Manual POSTs to the BFF paths answer 403.

Faster start for steps 5 to 7: `npm run cli -- e2e-golden-path --format swiss --superuser <superuser> --actor <actorId>` builds a Pro organization with four Teams, published with a fixture, and prints its ids. It has an even field, so it shows no bye until a withdrawal.

Proof: ARIA snapshot and screenshot per step, the `fixture-current` transcript for each readback, and the actor used.

## Gotchas

- The calendar knows paired rounds, not official ones. It takes the last paired round as current and hides the actions once standings say `isFinal`. Before the first official result there is no snapshot, so it cannot say final; a stale button answers 409 and `Esa ronda ya no es la que se está jugando`.
- After `No sabemos si se aplicó`, the dialog keeps its request id and locks `Equipo`, because the same id with another Team is refused. Reopening the dialog uses a new id, which can answer `Ese equipo ya estaba retirado`.
- Closing a round pairs the next one in the same request. If no legal pairing exists, the empty rounds disappear and the total in `Rondas emparejadas` shrinks. That is deliberate.
- Only Swiss has a web generate flow. A published league on the calendar still shows `Aún no hay calendario`; use `fixture-generate` there.
- A fixed `generationVersion: 1` makes a double click replay. Different values against an existing plan read `Ya existe un calendario generado con otros datos`.
