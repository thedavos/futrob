# Reprogramaciones

Reference for the Notion epic **Reprogramaciones**. Evidence is the tree at `de3c657` (`feat(scheduling): add reschedule request creation core`). This file does not change product code.

Create of a `ScheduleChangeRequest` exists in `@futrob/scheduling` and is tested in memory. List, HTTP, OpenAPI, SDK, persistence, accept, reject, counter, apply-on-accept, timezone interpretation, expiry, and captain or rival UI do not exist.

Staff can already change an encounter clock through fixture edit. That path is not the captain negotiation.

## How the scheduling clock works today

Scheduling owns when and how many. Results own what counts officially. Game-data owns what providers report. A reschedule that moves the clock belongs in scheduling. Recalc of the EA candidate window is a results read of the new `scheduledStartAt`. Sync does not auto-officialize.

Two mutation paths share the English word "reschedule":

1. Captain request. `CreateScheduleChangeRequestUseCase` writes an open `ScheduleChangeRequest`, publishes `scheduling.reschedule-requested`, and leaves fixture, snapshot, and `OfficialMatch` rows unchanged.
2. Staff fixture edit. `EditFixtureEncounterUseCase` needs `encounters.schedule.manage`, patches `FixtureEncounter.scheduledStartAt`, projects `EncounterScheduleSnapshot`, appends `fixture_encounter_audit`, and publishes `scheduling.encounter-rescheduled` with `scope` always `{ type: "entire_encounter" }`.

Captains and vice-captains receive `encounters.reschedule.request` on the encounter. They do not receive `encounters.schedule.manage` or `encounters.reschedule.resolve`. Organizer and staff receive every `ENCOUNTER_PERMISSION`. `encounters.reschedule.resolve` has no use case.

`CreateScheduleChangeRequestUseCase` is exported from `packages/scheduling/src/index.ts` and is not constructed in `apps/api/src/di/scheduling.module.ts`. There is no production `ScheduleChangeRequestRepository` adapter.

### Product rules

| ID | Text | Code |
| --- | --- | --- |
| FR-08 | Request, negotiate, and approve a full Encounter or one OfficialMatch. | Request and `RescheduleScope` exist. Negotiate and approve do not. |
| FTR-SCH-001 | Authorized captains, vice-captains, organizer, and staff may start or resolve per rules. | Request permission is wired. Resolve is unused. Approval flags on `CompetitionMatchRules` are not read. |
| FTR-SCH-002 | Do not reschedule an approved or finished match. Keep history. One active request blocks incompatible proposals. | Guard and scope-conflict exist in the create use case. Request history is not persisted. |
| FTR-SCH-003 | After accept, update the schedule and recalc the EA candidate window. | No accept. Staff edit updates the encounter clock. Window is computed at read time. |
| AC-SCH-001 | Accepting a slot-2 request moves only OfficialMatch 2, keeps the old date, recalc window. | No per-slot start in persistence. |
| AC-SCH-002 | Reschedule of an approved OfficialMatch is a typed reject. | `EncounterNotEditableForScheduleChange` exists when the guard is wired. The guard is not composed in `apps/api`. |
| DEC-030 | Max 2 applied reschedules per Team per Encounter, configurable. | Enforced in create against `countAppliedReschedules`. Nothing increments that count. |
| DEC-032 | Proposal expires in 12 hours or per competition rules. | Status token `expired` only. |
| DEC-033 | Expiry without agreement becomes `escalated`. Organizer may set a date or walkover. | Status token `escalated` only. |
| DEC-034 | After a deadline, only organizer and staff may request. | No deadline field. |
| UX-SCH-001 to UX-SCH-004 | Scope picker, previous and new time, history, disabled CTA on approved matches. | No Match Center. Nav items `fixture` and `encounters` are stubs. |

Suggested glossary statuses include `draft`, `pending_opponent`, `counter_proposal`, and `resolved_by_organizer`. The code union is `open`, `accepted`, `rejected`, `cancelled`, `expired`, `escalated`. Only `open` is written.

### Where things live

| Layer | Path |
| --- | --- |
| Domain aggregate | `packages/scheduling/src/domain/entities/schedule-change-request.ts` |
| Proposal | `packages/scheduling/src/domain/entities/schedule-change-proposal.ts` |
| Scope | `packages/scheduling/src/domain/value-objects/reschedule-scope.ts` |
| Create use case | `packages/scheduling/src/application/create-schedule-change-request.use-case.ts` |
| Staff apply | `packages/scheduling/src/application/edit-fixture-encounter.use-case.ts` |
| Permissions | `packages/scheduling/src/domain/policies/encounter-permissions.ts` |
| Events | `packages/scheduling/src/domain/events/reschedule-requested.event.ts`, `encounter-rescheduled.event.ts` |
| Catalog | `apps/web/src/shared/contracts/events/catalog.ts` |
| API composition | `apps/api/src/di/scheduling.module.ts` |
| Encounter HTTP | `apps/api/src/http/routes/encounters.ts` |
| Fixture HTTP | `apps/api/src/http/routes/fixtures.ts` |
| SDK | `packages/sdk/src/resources/encounters.ts` |
| Web module | `apps/web/src/modules/scheduling/index.ts` re-exports `@futrob/scheduling` only |

Scheduling application files are flat next to their tests, not in kebab folders. New use cases in this package should match that layout. `@futrob/results` uses kebab folders. Do not mix the two styles inside one package.

Tests import from `vite-plus/test`. Domain and application tests use fake ports. Persistence is `apps/api` Postgres. D1 does not store scheduling rows.

Suggested HTTP nest, matching candidates and schedule-snapshot:

- `POST /api/v1/encounters/:encounterId/schedule-change-requests`
- `GET /api/v1/encounters/:encounterId/schedule-change-requests`
- `GET /api/v1/encounters/:encounterId/schedule-change-requests/:requestId`
- respond as `POST .../:requestId/accept`, `reject`, `counter`

That nest is an observation of `registerEncounterRoutes`, not a closed product decision.

Machine-readable tests sit in [reprogramaciones.tests.json](/docs/notion-research/reprogramaciones.tests.json).

---

## [API] Crear/listar solicitudes de reprogramación

[Notion](https://app.notion.com/3dc7b204009a818c95a0e756f935c4f8). Backend, P0. HTTP and OpenAPI create and list. Permission `encounters.reschedule.request`. Depends on solicitudes WIP.

### Context

Create is a tested use case. List is a repository helper for the active-request invariant, not a public query. HTTP on `registerEncounterRoutes` covers candidates and schedule-snapshot only. OpenAPI has no schedule-change operation. `createSchedulingModule` does not instantiate `CreateScheduleChangeRequestUseCase`.

### Key paths and symbols

- `CreateScheduleChangeRequestUseCase`, `CreateScheduleChangeRequestInput`
- `createInitialScheduleChangeRequest`
- `ScheduleChangeRequestRepository.findByIdempotencyKey`, `listActiveByEncounter`, `save`
- `ENCOUNTER_PERMISSION.rescheduleRequest` = `"encounters.reschedule.request"`
- Tagged codes: `scheduling.schedule_change_encounter_not_found`, `authorization.forbidden`, `scheduling.invalid_schedule_change_request`, `scheduling.invalid_schedule_change_scope`, `scheduling.invalid_schedule_change_date`, `scheduling.invalid_schedule_change_reason`, `scheduling.rescheduling_disabled`, `scheduling.reschedule_limit_reached`, `scheduling.encounter_not_editable_for_schedule_change`, `scheduling.active_schedule_change_request_exists`, `scheduling.schedule_change_idempotency_conflict`
- `failureToHttp` / `statusForFailureCode` in `apps/api/src/http/errors.ts`
- Live neighbors: `GET /encounters/:encounterId/candidates`, `GET` and `PUT /encounters/:encounterId/schedule-snapshot`

### Gaps

- No `findById`. No list-by-encounter for history. `listActiveByEncounter` is an invariant helper. The in-test fake treats only `status === "open"` as active.
- No Postgres tables `schedule_change_requests` or `schedule_change_proposals`. Conceptual names exist in `product/mvp-requirements.md`.
- No production adapters for `ScheduleChangeRequestRepository`, `CompetitionRescheduleRulesPort`, or `ScheduleChangeRequestEditGuardPort`.
- `statusForFailureCode` maps `not_found` to 404, `forbidden` to 403, `invalid` to 400, `conflict` and `not_editable` to 409. `scheduling.active_schedule_change_request_exists`, `scheduling.rescheduling_disabled`, and `scheduling.reschedule_limit_reached` fall through to 500 until the mapper learns those codes.
- Create ignores `minimumRescheduleNoticeHours`, `rescheduleRequiresOpponentApproval`, and `rescheduleRequiresOrganizerApproval` on `CompetitionMatchRules`.
- Idempotency is a required body-like field `idempotencyKey` on the use case. Fixture edit uses UUID `requestId`. CORS allowlists `X-Request-ID`, not a schedule-change idempotency header.

### Behavior tests

Existing coverage lives in `packages/scheduling/src/application/create-schedule-change-request.use-case.test.ts`. Keep those tests. Do not restate them as HTTP tests without an HTTP call.

Missing HTTP tests belong in `apps/api/src/http/routes/encounters.test.ts`, next to the candidates harness (`createApp`, `serviceHeaders`). Missing OpenAPI or contract tests belong beside other `packages/api-contracts` encounter schemas. Adapter tests belong in `apps/api/src/adapters/scheduling/` next to `encounter-schedule.repository.test.ts`.

Assert status, `code`, and body fields with literal values. A test that only checks `toHaveBeenCalled` is not enough.

### Notas

Wire create before inventing list filters. Persistence unique index on `(organization_id, idempotency_key)` is required for the replay tests to survive Postgres. Decide whether two `official_match` requests on slots 1 and 2 stay legal before you add a unique "one open request per encounter" index. Current create tests allow that pair and reject `entire_encounter` against any open request.

---

## [SDK] Cliente de solicitudes de reprogramación

[Notion](https://app.notion.com/3dc7b204009a81668f55c748d001f333). Backend, P0. SDK create, list, and respond. Depends on [API].

### Context

`createFutrobClient` exposes `encounters` from `packages/sdk/src/resources/encounters.ts`. That resource has snapshot get and upsert, fixture generate, get, and `editFixtureEncounter`. There is no schedule-change method. `packages/sdk/src/resources/encounters.test.ts` does not exist. `packages/sdk/src/resources/competitions.test.ts` already calls `client.encounters.editFixtureEncounter`.

Respond methods cannot ship before accept, reject, and counter exist on the API. The SDK card still names them.

### Key paths and symbols

- `createEncountersResource`, `EncountersResource`, `createFutrobClient`
- `editFixtureEncounter` (staff clock, not a request)
- Contract parse pattern in `packages/sdk/src/resources/results.ts` and `packages/sdk/src/resources/results.test.ts`
- `apiPath("encounters", encounterId, ...)`

### Gaps

- No `createScheduleChangeRequest`, `listScheduleChangeRequests`, `getScheduleChangeRequest`, `acceptScheduleChangeRequest`, `rejectScheduleChangeRequest`, `counterScheduleChangeRequest`.
- No Zod DTOs in `packages/api-contracts` for those operations.
- Mobile is supposed to consume `/api/v1` through `@futrob/sdk`. Web competitions currently use a BFF browser client, not this SDK. A later UI task must pick one client. The SDK card is still required for mobile and CLI.

### Behavior tests

Add `packages/sdk/src/resources/encounters.test.ts`. Mirror `results.test.ts`. Stub `fetchImpl`, assert method, URL, JSON body, and parsed return with literals. Cover create 201, list array, identical idempotent replay, forbidden 403, and one respond method once the API exists.

CLI smoke is optional and is not this card. If you add it later, follow `apps/cli/src/commands/scheduling.ts` and `npm run cli --`.

### Notas

Do not expose `editFixtureEncounter` as the captain request client. Captains must not call `encounters.schedule.manage`. Keep request methods on `client.encounters` next to snapshot, not on `client.competitions`.

---

## [UI] Flujo capitán: solicitar reprogramación

[Notion](https://app.notion.com/3dc7b204009a81f5babdf6580ce445dd). Frontend, P0. Captain requests a date, with timezone plus loading and error. Depends on SDK.

### Context

No captain form exists. Competition setup can persist reschedule **rules** and an IANA zone. Player home can format the next fixture in that zone. Match Center is not a route. Shell nav `Calendario` (`fixture`) and `Enfrentamientos` (`encounters`) are `stub: true`.

### Key paths and symbols

- `MatchRulesEditor` in `apps/web/src/modules/competitions/presentation/competition-setup-steps.tsx` (`Permitir reprogramaciones`, max, notice hours, rival and organizer approval)
- Competition IANA select on the same setup flow
- `formatEncounterWhen` in `apps/web/src/modules/player-home/presentation/player-home-copy.ts` (weekday, day, month, hour, minute in `competition.timeZone`, no `timeZoneName`)
- `useCan` in `apps/web/src/shared/presentation/permissions/use-can.ts`
- `ENCOUNTER_PERMISSION.rescheduleRequest`
- UX-SCH-001, UX-SCH-002, UX-SCH-004, UX-I18N-002
- Query keys live under `apps/web/src/shared/presentation/query/query-keys.ts` (ADR-0012)

### Gaps

- No request dialog or page. No scope picker. No reason field. No loading or typed-error mapping for `scheduling.*` codes.
- No `es` and `en` message keys for the flow. Orphan Paraglide keys `operational_reschedule_justification` are unused.
- `formatEncounterWhen` does not print the zone name. i18n rules ask for UTC storage, user-zone render, and competition zone when scheduling context matters.
- UX-SCH-004 has no control to disable. The domain guard is `EncounterNotEditableForScheduleChange`.
- `apps/web/src/modules/scheduling/` has no `presentation/` folder.
- Presentation must not import the use case. Call `/api/v1` through a browser client or SDK after the API card.

### Behavior tests

UI tests belong under `apps/web/src/modules/scheduling/presentation/` once those files exist. Assert visible copy, disabled CTA when `useCan` is false, disabled CTA when the match is approved, posted body (scope, ISO instant, reason), and the error code shown for `scheduling.invalid_schedule_change_date`. Drive the form the way a captain would. Do not assert StyleX class names.

Verify-futrob has no reschedule recipe yet. Match Center routes must exist before an e2e recipe is useful.

### Notas

Spanish setup copy for rules is hardcoded today. New flow copy must go through `messages/es.json` and `messages/en.json`. Show the competition IANA zone next to the datetime control. Store an instant, not a zoned wall-clock string, unless the TZ domain card defines a different wire shape.

---

## [UI] Flujo rival: aceptar / rechazar / contraproponer

[Notion](https://app.notion.com/3dc7b204009a819d9376d0cd82224218). Frontend, P0. Rival accept, reject, counter, and history. Depends on the aceptación feature and the SDK.

### Context

No accept, reject, or counter use case exists. Queue Storybook rows titled `Responder reprogramación`, `Revisar contrapropuesta`, and `Resolver reprogramación` are chrome only. The live shell renders `QueuePlaceholder`. UX-MAT-007 (rival confirm, reject, counter) is official **selection**, not schedule change. Do not reuse that copy for this flow.

### Key paths and symbols

- `apps/web/src/shared/presentation/shell/queue-task-item.stories.tsx`
- Design Match Center tab **Schedule** (`design.md`)
- UX-SCH-003 history
- Future `ENCOUNTER_PERMISSION.rescheduleRequest` for the rival captain. Organizer resolve uses `encounters.reschedule.resolve`.
- `ScheduleChangeRequest.proposals` is a non-empty tuple and can hold a counter once something appends

### Gaps

- No history UI. Repository cannot list closed requests or proposal chains for an encounter.
- `ScheduleChangeProposal` has `proposedStartAt`, actor, team, reason, `createdAt`. It has no `expiresAt` and does not store the previous clock. UX-SCH-002 wants previous time, new time, reason, and expiry on the proposal card.
- Self-accept (proposer accepts own latest proposal) has no type and no UI rule yet.
- Mobile has no encounter or fixture screens.

### Behavior tests

Once presentation exists, assert three actions, the typed error when the request is no longer `open`, and a history list that shows proposal times as ISO instants rendered in the competition zone. Include the empty history state. Do not treat Storybook titles as product coverage.

### Notas

Gate the rival actions on permission and on "this actor's team is the other side of the Encounter". Staff resolve is a different CTA. Keep captain negotiate and organizer `editFixtureEncounter` visually distinct so operators do not confuse them.

---

## [Domain] Apply fecha al fixture + historial

[Notion](https://app.notion.com/3dc7b204009a8106bf64ebfb4a51802c). Backend, P0. Apply to fixture, keep history, no double apply. Depends on aceptación and solicitudes.

### Context

Accept does not exist. The only apply is staff `EditFixtureEncounterUseCase`. That use case already serializes with `EncounterMutationLockPort`, refuses a superseded plan, replays `FixtureAuditPort.findByRequestId` without a second apply, checks `FixtureEncounterEditGuardPort`, bumps `FixturePlan.revision`, projects the snapshot, and emits `scheduling.encounter-rescheduled`.

`projectFixtureEncounter` upserts `EncounterScheduleSnapshot.scheduledStartAt`. `OfficialMatch.upsertMany` is insert-only and the row has no start column. Slot-scoped apply cannot land on current SQL.

### Key paths and symbols

- `EditFixtureEncounterUseCase`, `replaceEncounter`, `projectFixtureEncounter`
- `FixtureAuditPort`, `fixture_encounter_audit` unique `(organization_id, competition_id, request_id)`
- `EncounterRescheduledEvent` (`previousStartAt`, `newStartAt`, `scope`, `approvedBy`)
- `CompetitionRescheduleRulesPort.countAppliedReschedules`
- `OfficialMatch` / `apps/api/migrations/0021_official_matches.sql`
- `EncounterScheduleSnapshot.scheduledStartAt`

### Gaps

- No accept-to-apply call. Captains must not be granted `encounters.schedule.manage` as a shortcut.
- Event scope is hardcoded to `entire_encounter` even when a future request is `official_match`.
- No increment of applied-reschedule counts, so DEC-030 will not move after a successful apply.
- Request aggregate has no `appliedAt` and no transition to `accepted`.
- `scheduling.encounter-rescheduled` has no consumer. Candidate window is `candidateWindowFor(encounter.scheduledStartAt)` at list time in results. DEC-024 (keep prior candidates, recompute eligibility) is not implemented.
- `EventPublisher` in API is documented as a no-op until outbox is wired.

### Behavior tests

Existing staff apply and audit replay: `packages/scheduling/src/application/edit-fixture-encounter.use-case.test.ts` (`reschedules a pending encounter, bumps revision, and records one audit entry`). Keep that test for the staff path.

Missing application tests, colocated as `packages/scheduling/src/application/accept-schedule-change-request.use-case.test.ts` (name may differ):

- Accept of `entire_encounter` moves snapshot `scheduledStartAt` to the latest proposal instant and writes one audit row.
- Second accept of the same request returns the same clock and does not emit a second `scheduling.encounter-rescheduled`.
- Accept of `official_match` slot 2 leaves slot 1's start unchanged once per-slot starts exist.
- Accept when the fixture revision lost a race returns `scheduling.fixture_update_conflict` or a dedicated already-applied code, and the snapshot stays on the winner's instant.
- Applied count for the requesting team on that encounter becomes `1`.

Assert the snapshot instant and the event payload literals, not repository call counts.

### Notas

Reuse fixture mutation and guards. Do not add a second writer to `fixture_encounters`. Slot-level AC-SCH-001 needs a `scheduled_start_at` on `official_matches` or an equivalent slot clock. Until that column exists, do not pretend slot apply works. `UpsertEncounterScheduleSnapshotUseCase` refuses fixture-owned encounters (`scheduling.fixture_managed_conflict`). Accept must not call that legacy writer.

---

## [Domain] Reglas de zona horaria en reprogramaciones

[Notion](https://app.notion.com/3dc7b204009a81b7b2aeca50ffce5a40). Backend, P0. Competition TZ and no UTC ambiguity. Depends on solicitudes.

### Context

Competitions store `Competition.timeZone` as an IANA id validated with `Intl.DateTimeFormat`. Fixture generation uses the same id on `FixturePlan.timeZone`. `roundStart`, `zonedParts`, and `instantForZonedParts` in `packages/scheduling/src/domain/policies/generate-fixture-plan.ts` preserve wall-clock time across US spring-forward (`America/New_York` test). Create-request and fixture-edit take a `Date` and compare `getTime()`. They do not re-read the competition zone.

Wire datetimes today are `z.string().datetime()` ISO UTC (`scheduledStartAt` on snapshots and fixture encounters).

### Key paths and symbols

- `Competition.timeZone`, `isIanaTimeZone` in create and update competition draft
- `FixturePlan.timeZone`, `generate-fixture-plan.ts` `zonedParts`, `instantForZonedParts`
- `createScheduleChangeProposal` future and inequality checks
- `formatEncounterWhen(iso, timeZone, locale)`
- `.cursor/rules/i18n.mdc` requires UTC instants and IANA ids. Do not persist formatted strings.

### Gaps

- No kernel IANA branded type. Zone is `string`.
- Create input has no zone field. A client that sends a local-looking ISO without `Z` is a Zod issue at the HTTP boundary once a schema exists. `z.string().datetime()` rejects most non-offset strings.
- Fall-back DST (ambiguous hour) has no policy. Spring-forward is covered only in fixture generation.
- `calendarDaysBetween` in `@futrob/shared-kernel` uses the host calendar, not the competition IANA zone. Do not use it to compute notice hours.
- `minimumRescheduleNoticeHours` is not applied, so "12 hours before kickoff in Lima" is not tested.
- UI does not show the zone name beside the control.

### Behavior tests

Extend `packages/scheduling/src/domain/policies/generate-fixture-plan.test.ts` only for generation. Reschedule TZ tests belong next to create and, once it exists, accept:

- A proposal whose UTC instant is 20:00 in `America/Lima` stores that same epoch and echoes `2026-09-20T01:00:00.000Z` (or whatever the chosen local wall time converts to) on the event `proposedStartAt` string.
- A wall time that does not exist on spring-forward in the competition zone is `scheduling.invalid_schedule_change_date`.
- A proposal that equals the current encounter instant in UTC is rejected even if the client labeled it in another zone.
- HTTP create that omits an offset fails `api.validation_error` before the use case runs.

Do not assert `Intl` options objects. Assert the stored epoch and the ISO string on the event.

### Notas

Keep one rule. Persist UTC. Interpret naive wall times, if the API ever accepts them, only in `Competition.timeZone`. Do not interpret in the worker's local TZ or the user's browser TZ at the domain boundary. Presentation may also show the user zone, and must still label the competition zone.

---

## [Domain] Expiración y escalamiento al organizador

[Notion](https://app.notion.com/3dc7b204009a81e59976e4124d29ae66). Backend, P1. Expire and escalate with resolve. Depends on apply fecha.

### Context

Status tokens `expired` and `escalated` exist on the union. Nothing writes them. `ScheduleChangeProposal` has no `expiresAt`. Web cron in `apps/web/src/server.ts` only recovers provider sync jobs. `@futrob/notifications` is empty. ADR-0008 says scheduling emits events and communications send mail. Walkover after DEC-033 is a results concern, not a scheduling clock write.

`minimumRescheduleNoticeHours` default 12 is notice before kickoff. DEC-032 default 12 hours is proposal TTL. They are different clocks that currently share the number 12.

### Key paths and symbols

- `ScheduleChangeRequestStatus`
- `ENCOUNTER_PERMISSION.rescheduleResolve`
- DEC-032, DEC-033, DEC-034
- `ClockPort` for deterministic `now`
- Future worker or API cron in `apps/api` or `apps/web/src/workers/` (thin handler, use case in the package)

### Gaps

- No expire use case, escalate use case, or organizer-resolve-on-request use case.
- `rescheduleResolve` is granted to organizer and staff and never checked.
- DEC-034 deadline field does not exist on `CompetitionMatchRules`.
- Escalated requests are not defined as "active" for `listActiveByEncounter`. A new create could slip in after expiry if escalate does not keep the row active.
- Notifications for reschedule are FTR-NTF-001 and are not implemented.

### Behavior tests

Colocate `expire-schedule-change-request.use-case.test.ts` and `escalate-schedule-change-request.use-case.test.ts` (names may differ) under `packages/scheduling/src/application/`.

- Open request whose proposal TTL passed becomes `expired` then `escalated` in one policy you document, or `expired` with a separate escalate command. Pick one and assert the status literal.
- `clock.now()` 11h59m after create leaves status `open`.
- After escalate, a captain create for the same scope returns `scheduling.active_schedule_change_request_exists` if product keeps the row blocking.
- Actor without `encounters.reschedule.resolve` gets `authorization.forbidden` with that permission string.
- Organizer resolve after escalate applies the clock once (reuse apply tests).

Do not sleep in tests. Inject `ClockPort`.

### Notas

Do not reuse `minimumRescheduleNoticeHours` as proposal TTL without renaming. If both remain 12, tests must still distinguish "too close to kickoff" (`invalid_schedule_change_date` or a new code) from "proposal timed out" (`expired`). Walkover belongs in results after scheduling marks `escalated`.

---

## [QA] Carreras de aceptación concurrente de reprogramación

[Notion](https://app.notion.com/3dc7b204009a81c7b276c422df5accb1). QA, P1. One winner, second typed, idempotent. Depends on apply fecha.

### Context

Create already serializes on `EncounterMutationLockPort.runExclusive(encounterId)` inside `TransactionPort`. Tests cover concurrent creates, a lock that is bound to the transaction, and idempotent replay without a second event. Postgres lock is `pg_advisory_xact_lock(hashtextextended($1, 0))` with key `scheduling:encounter:${encounterId}` in `apps/api/src/adapters/scheduling/encounter-mutation-lock.ts`.

Accept races cannot be tested until accept exists. Staff fixture edit already has revision CAS (`FixtureUpdateConflict`) and audit unique `request_id`. Results select and confirm do **not** use this lock. Do not copy the results pattern.

### Key paths and symbols

- `EncounterMutationLockPort`
- `InMemoryEncounterMutationLock`, `PostgresEncounterMutationLock`
- `TransactionBoundEncounterMutationLock` in the create tests
- `ActiveScheduleChangeRequestExists`
- `ScheduleChangeRequestIdempotencyConflict`
- `FixtureUpdateConflict` / `scheduling.fixture_update_conflict`
- `statusForFailureCode` 409 via `conflict`

### Gaps

- No accept idempotency key. Staff edit `requestId` is a different unique column.
- No `already accepted` tagged error. Second concurrent accept needs a stable `code` that maps to 409.
- Create lock proves the mutex. It does not prove accept-plus-apply under two actors.
- HTTP mapper 409 list does not include `exists` or `limit_reached`. Concurrent create over HTTP would 500 today even if the route existed.

### Behavior tests

After accept exists, add races to the accept use-case test file, same shape as `serializes concurrent requests so only one active request is created`:

- Two rival accepts on one `open` request: one `accepted` with snapshot moved once, one tagged error, one `scheduling.encounter-rescheduled`.
- Same actor, same accept, twice: one apply, same request body returned, still one event.
- Accept concurrent with a counter: one winner, the other a typed non-`open` error, fixture clock matches the winner.
- Accept concurrent with staff `EditFixtureEncounterUseCase` on the same encounter: lock order still yields one clock and a typed conflict for the loser.

Postgres adapter test: two transactions on one `encounterId` with `PostgresEncounterMutationLock` do not both apply. Skip when `DATABASE_URL` is unset, matching other API adapter tests.

### Notas

Hold the encounter lock inside the transaction, as the create tests already require. An in-memory lock outside the transaction is a false green. Idempotent retry must not emit a second `scheduling.encounter-rescheduled`. That is the FTR-SCH-003 and outbox rule for this epic.

---

## Cross-cutting tensions

1. **One active request per Encounter** in FTR-SCH-002 and some Notion AC versus **two open slot-scoped requests** in `allows active requests for two different OfficialMatch slots`. Persistence unique indexes depend on this choice.
2. **Glossary statuses** versus the code union. Counter is likely another `ScheduleChangeProposal` while status stays `open`, not a `counter_proposal` status.
3. **Staff PATCH** versus **captain accept-apply**. Same table, different permission, different `requestId` namespaces (`fixture_encounter_audit.request_id` versus `ScheduleChangeRequest.id`).
4. **DEC-032 TTL** versus **notice hours** versus **DEC-034 deadline**. Three clocks.
5. **HTTP 500 fall-through** for several create codes in `statusForFailureCode`.

Follow-up work stays hexagonal. Use cases and errors live in `packages/scheduling`. Adapters and SQL live in `apps/api`. Composition lives only in `apps/api/src/di/scheduling.module.ts`. Thin HTTP lives in `apps/api/src/http/routes/encounters.ts`. UI lives in `apps/web/src/modules/scheduling/presentation/`. Do not put accept logic in results. Do not write statistics from scheduling.
