# Results / Match Center

Two Team representatives agree on the EA matches that count for an Encounter, and an organizer reviews disputes and integrity flags. The surface is the competition encounters list and the Encounter route, driven against live web, auth, API and Postgres with EA observations synced by real provider jobs. Preview never officializes; only confirmation or an organizer approval creates an official result.

## Sub-features

- `res-list` lists the active fixture's Encounters at `/orgs/$orgId/competitions/$competitionId/encounters` (staff, `Enfrentamientos`) and `/orgs/$orgId/competitions/$competitionId/matches` (Team members, `Partidos`, only their Encounters). Rows are links named `Abrir {home} vs {away}` with round, status (`Programado`, `Pendiente de resultado`, `Resultado oficial`), kickoff in the competition time zone and slot count. States: loading (`status` `Cargando enfrentamientos`), empty (`Aún no hay enfrentamientos`), unavailable (`Competición no disponible`), error (`No pudimos cargar los enfrentamientos.` + `Reintentar`).
- `res-preview` assigns candidates with `Usar en partido N`; `Vista previa` shows each slot and, in aggregate series, the group `Global`. No request is sent.
- `res-team` covers `Proponer selección`, `Confirmar propuesta`, `Rechazar`, `Proponer alternativa` and `Abrir disputa` in region `Selección oficial`. The proposer never gets a confirm action.
- `res-review` covers region `Revisión de la organización`: `Tomar el caso`, `Aprobar una propuesta` (radio per proposal, `Motivo`, and the checkbox `Revisé los avisos de integridad y apruebo igualmente` when flags exist) and `Devolver a selección`. Tabs `Caso actual` / `Historial`.
- `res-recovery` covers version conflicts (`La selección cambió: leíste la versión N y ahora está en la M…`), unknown outcomes (`No sabemos si se guardó…` + `Reintentar` with the same command key) and redaction (`[REDACTED]`).
- `res-permissions` covers a roster player without result authority: no Team or review actions, and 403 on manual BFF calls.

## How to get to it (user POV)

- Organizer: org home → competition link → sidebar `Enfrentamientos` → row `Abrir … vs …` → Encounter.
- Team representative: sidebar `Competiciones` (`/player/competitions`, `Mis competiciones`) → competition row → sidebar `Partidos` list → row → Encounter.
- Pending sidebar items and activity rows also link to these routes. A deep link to the Encounter does not prove the navigation entries above.

## Driving it with verify-futrob

Preconditions:

- `helpers/verify-futrob doctor` exits 0 with `db: ok`.
- Four disposable accounts from real signup: organizer, captain A, captain B and a reader. Concurrent roles need isolated browser sessions (separate profiles or Playwright contexts); one cookie jar per role.
- Data through the product API (`npm run cli --` or `@futrob/sdk` as the organizer): organization, published competition with rules (`officialMatchesPerEncounter`, `resolutionMode`), two approved Teams with captains, EA club connections, fixture generated at a time that matches real EA matches. Then run real sync jobs (`sync-job-enqueue <org> <club> --platform common-gen5 --edition fc27 --match-type friendlyMatch|leagueMatch|playoffMatch`, `sync-job-run`) so candidates come from persisted observations.
- Find a usable EA sample first: `GET /api/v1/game-data/clubs/<club>/matches?matchType=…` through the API (live egress) and look for a pair of clubs with several matches inside the ±6 h candidate window. X/Y vs X/Z needs three matches of one pair; flags need a match with `wasDisconnected` or partial data.

- **List.** As organizer, click the competition and `Enfrentamientos`; assert one link per paired Encounter and the status text. Open it by clicking the row.
- **Team flow.** As A, assign candidates, read `Vista previa`, `Proponer selección` → `Enviar propuesta`. As B, answer. Read back from the other captain's view and Postgres (`official_match_selections`, `official_selection_proposals`, `official_selection_actions`, `official_results`, contributions).
- **Review.** As organizer, `Tomar el caso` with a reason, then `Aprobar una propuesta` (choose the proposal, reason, acknowledgement if flags) or `Devolver a selección`. Verify exact references in `official_results.slots`, approval basis, audit actions and contributions, plus `npm run cli -- standings`.
- **Conflict.** Open the same command dialog in two organizer sessions; submit in one, then the other. Expect 409 `results.selection_version_conflict`, the explanation, kept text and no resend.
- **Recovery.** Fail the command transport only (for example CDP `Fetch.failRequest` at request stage, then at response stage after the real server answered). Retry from the dialog and confirm the same `commandKey` and payload and identical row counts.
- **Proof.** Screenshot + ARIA per step, request bodies, and SQL readbacks before and after each mutation.

## Gotchas

- Development Postgres can be slow: commands may take tens of seconds and the BFF gives up on auth `get-session` after 10 s, answering 503 before reaching the API. The UI then shows the unknown-outcome notice; check Postgres before retrying.
- Playwright `route.fetch` resolves `localhost` to IPv4 while Vite listens on `[::1]`; use CDP `Fetch` instead to drop a real response.
- `Hubo desconexión` / `Datos parciales` candidates route a confirmed selection to `organizer_review`; approving needs the acknowledgement, and an approval without it is 409 `results.integrity_flags_not_acknowledged`.
- A reference held by a live selection cannot be proposed elsewhere (`reference_already_claimed`); returning to selection releases it.
- The organizer sees region `Selección oficial` with `Actúas por` but the server denies the Team read; that panel is not an organizer path.
- Do not inject selection or result rows by SQL; read Postgres only.
