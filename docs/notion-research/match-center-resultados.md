# Match Center y resultados

Research for the Notion epic Resultados. Source pages are blank except properties. Criteria below come from those properties plus the current tree. This note does not change product code.

**Overview.** `@futrob/results` already owns official selection, opponent confirmation, void, and a read of EA candidates for an Encounter. HTTP exposes the candidate read only. Captains cannot propose, confirm, reject, or dispute over `/api/v1`. There is no Match Center route. Official confirmation already snapshots `ProviderMatch` into `OfficialResult` and, inside `apps/api` composition, projects statistics. Bracket winner slots stay as generation placeholders. Catalog events `results.official-selection-confirmed` and `results.match-dispute-opened` have no producer. `apps/api` wires `NoopEventPublisher`, so published names do not leave the process.

**Key concepts.**

- `Encounter` is the scheduled pairing. `scheduling` owns when and how many official slots.
- `ProviderMatch` is a provider observation. `game-data` owns it. `UNIQUE (provider_key, external_match_id)` lives on `provider_matches`.
- `MatchCandidate` in the glossary is a `ProviderMatch` shown for an Encounter window. The code does not persist an Encounter-to-candidate row. `ListEncounterCandidatesUseCase` computes the list at read time.
- `official_matches` (`apps/api/migrations/0021_official_matches.sql`) are scheduling slot shells for an Encounter. They are not EA candidates.
- `OfficialMatchSelection` assigns `ExternalReference` values to slots 1 or 2.
- `OfficialResult` is the approved snapshot that statistics may project. Status is `approved` or `voided`.
- `MatchDispute` exists only in `product/domain-glossary.md`. There is no type, table, or use case.
- `SelectionStatus` lists nine states. Writes today use `awaiting_opponent_confirmation`, `approved`, and `voided` (void of the result, not a first-class selection path).

**How it works today.**

1. Sync stores `ProviderMatch` rows. Identity is `provider_key` plus `external_match_id`.
2. `GET /api/v1/encounters/:encounterId/candidates` runs `ListEncounterCandidatesUseCase`. The window is `candidateWindowFor(scheduledStartAt)` with `CANDIDATE_WINDOW_HALF_HOURS = 18`. The product default in DEC-023 is plus or minus 6 hours.
3. `SelectOfficialMatchesUseCase` checks `encounters.official-selection.propose`, slot count, and duplicate refs, then saves a new `OfficialMatchSelection` and publishes `results.official-matches-selected`. It does not check that the refs are current candidates.
4. `ConfirmOfficialSelectionUseCase` checks `encounters.official-selection.resolve`, copies provider snapshots into `OfficialResult`, sets selection status to `approved`, and publishes `results.official-result-approved`. A second confirm on a reset status creates revision 2. It does not publish `results.official-selection-confirmed`.
5. `create-modules.ts` wraps confirm (and void) with `ProjectOfficialResultUseCase` in one transaction. No HTTP route calls that wrapper.
6. Captains and vice-captains of a participating Team with an approved entry receive both propose and resolve at encounter scope. The confirmer is not required to be the rival. DEC-022 wants both captains to confirm the same selection.
7. `OfficialResultFixtureEditGuard` refuses schedule edits when any non-voided selection exists. Recalc after reschedule therefore cannot run after a proposal unless that guard changes.

**Where things live.** Domain and use cases in `packages/results/src/`. Postgres adapters in `apps/api/src/adapters/results/`. HTTP in `apps/api/src/http/routes/encounters.ts`. SDK in `packages/sdk/src/resources/results.ts` (candidates only) and `packages/sdk/src/resources/encounters.ts` (schedule and fixture, not results commands). Web module `apps/web/src/modules/results/index.ts` re-exports the package and has no presentation. Design contract in `design.md` under Match Center. Conceptual web route `/orgs/:orgId/competitions/:competitionId/encounters/:encounterId`.

**Gotchas.** Candidate HTTP maps `OfficialSelectionForbidden` to 404 `results.encounter_not_found`. `failureToHttp` would map the same code to 403 because the string contains `forbidden`. `results.selection_not_confirmable` and `results.provider_match_snapshot_missing` hit the default 500 in `statusForFailureCode`. New mutation routes must copy the 404 hide and add explicit mappings for those confirm codes. `official_match_selections` has no `organization_id` column. `results-smoke` is in-memory fakes, not HTTP. `apps/web/src/workers/statistics-projection.worker.ts` still throws `not implemented`. API composition already projects inside the confirm transaction. `VoidOfficialResultUseCase` converges on a second void. Confirm does not.

Suggested delivery order follows Notion deps. Persist candidate association, then HTTP mutations, then SDK, then reject and dispute domain, then Match Center UI, then bracket advance, then append-only audit, then HTTP integration.

## [API] Endpoints selección / confirmación / disputa

### Context

P0, Fase 4, Backend. Criteria. HTTP plus OpenAPI for official selection, confirmation, and dispute. Typed errors. Do not trust a client-sent role. Deps. Permitir selección de partidos oficiales. Implementar confirmación rival y disputas. Notion note. Missing HTTP endpoints.

Use cases for select and confirm already exist. Dispute does not. Routes, OpenAPI paths, and Zod command bodies for those commands do not exist. Actor identity already comes from service auth, not from a role field.

### Key paths and symbols

- `apps/api/src/http/routes/encounters.ts` `registerEncounterRoutes`. Implemented `GET /encounters/:encounterId/candidates` and schedule-snapshot GET or PUT.
- `apps/api/src/http/middleware/service-auth.ts` `createServiceAuthMiddleware`. Bearer `INTERNAL_JOB_SECRET` plus `X-Futrob-Actor-Id`.
- `apps/api/src/di/results.module.ts` `selectOfficialMatches`, `confirmOfficialSelection`, `voidOfficialResult`, `listEncounterCandidates`.
- `apps/api/src/di/create-modules.ts` `confirmOfficialSelectionAndProject`, `voidOfficialResultAndUnproject`, `NoopEventPublisher`.
- `apps/api/src/adapters/events/noop-event-publisher.ts`.
- `packages/results/src/application/select-official-matches/select-official-matches.use-case.ts` `SelectOfficialMatchesUseCase`.
- `packages/results/src/application/confirm-official-selection/confirm-official-selection.use-case.ts` `ConfirmOfficialSelectionUseCase`.
- `packages/results/src/domain/policies/result-permissions.ts` `RESULT_PERMISSION`.
- `apps/api/src/http/errors.ts` `failureToHttp`, `statusForFailureCode`.
- `packages/api-contracts/src/v1/openapi/document.ts` paths under `/encounters/{encounterId}/candidates` only.
- `packages/api-contracts/src/v1/encounters/schemas.ts` `listEncounterCandidatesResponseSchema`. No select, confirm, or dispute schemas.

Suggested commands on the same encounters router, after new Zod contracts.

- `POST /encounters/{encounterId}/official-selection`
- `POST /encounters/{encounterId}/official-selection/confirm`
- `POST /encounters/{encounterId}/official-selection/reject`
- `POST /encounters/{encounterId}/official-selection/alternatives`
- `POST /encounters/{encounterId}/disputes`
- `GET /encounters/{encounterId}/official-result`

Confirm must call `confirmOfficialSelectionAndProject`, not the raw use case, so statistics stay in the same transaction.

### Gaps

- No HTTP handler calls `selectOfficialMatches` or `confirmOfficialSelectionAndProject`.
- No reject, alternative, or dispute use case to expose.
- No OpenAPI operationIds for those commands.
- `failureToHttp` maps `results.official_selection_forbidden` to 403. Candidate GET already hides that as 404. Mutations must do the same.
- `results.selection_not_confirmable` and `results.provider_match_snapshot_missing` currently map to 500. Confirm HTTP must map them to 400, 404, or 409 before those routes ship.
- Confirm does not check that the actor is the rival. Both participating captains hold `encounters.official-selection.resolve`.
- Replay of confirm currently allocates a new `OfficialResult` revision when status is forced back to `awaiting_opponent_confirmation`. HTTP must not duplicate stats effects. See NFR-02.
- `voidOfficialResultAndUnproject` is also unwired. Void is adjacent, not in this Notion Tarea.
- OpenAPI `bearerAuth` is labeled JWT and does not document `X-Futrob-Actor-Id` or `INTERNAL_JOB_SECRET`.

### Behavior tests

1. Given an Encounter with `officialMatchCount` 1, two distinct window candidates, and a captain actor with propose. When the client `POST`s `/api/v1/encounters/{id}/official-selection` with one valid `ExternalReference` and service-auth headers. Then the status is 201 and body `status` is `awaiting_opponent_confirmation`. File `apps/api/src/http/routes/encounters-selection.test.ts`.
2. Given the same Encounter and an actor from another organization. When that actor `POST`s the same path. Then the status is 404 and body `code` is `results.encounter_not_found`. File `apps/api/src/http/routes/encounters-selection.test.ts`.
3. Given a valid body and no `Authorization` header. When the client `POST`s the selection path. Then the status is 401 and body `code` is `api.unauthorized`. File `apps/api/src/http/routes/encounters-selection.test.ts`.
4. Given `officialMatchCount` 2 and a body with one slot. When the captain proposes. Then the status is 400 and body `code` is `results.invalid_selection`. File `apps/api/src/http/routes/encounters-selection.test.ts`.
5. Given two slots that repeat the same `providerKey` and `externalId`. When the captain proposes. Then the status is 400 and body `code` is `results.duplicate_provider_match`. File `apps/api/src/http/routes/encounters-selection.test.ts`.
6. Given a selection in `awaiting_opponent_confirmation` and the rival captain. When the rival `POST`s `/api/v1/encounters/{id}/official-selection/confirm`. Then the status is 200, `OfficialResult.status` is `approved`, and `revision` is 1. File `apps/api/src/http/routes/encounters-selection.test.ts`. Do not assert a durable outbox until `NoopEventPublisher` is replaced.
7. Given that approved result. When the rival confirms again with the same idempotency key. Then the status is 200, `revision` stays 1, and `player_match_contributions` still has one row. File `apps/api/src/http/routes/encounters-selection.test.ts`.
8. Given a JSON body that sets `role` to `organizer`. When an actor without propose posts selection. Then the status is still 404 `results.encounter_not_found`. File `apps/api/src/http/routes/encounters-selection.test.ts`.
9. Given no selection. When anyone posts confirm. Then the status is 404 and body `code` is `results.selection_not_found`. File `apps/api/src/http/routes/encounters-selection.test.ts`.
10. Given OpenAPI generated from `futrobOpenApiV1`. When the test reads `paths`. Then `/encounters/{encounterId}/official-selection` POST, confirm POST, and disputes POST exist with `ApiError` 401 and 404. File `packages/api-contracts/src/v1/openapi/encounter-selection.test.ts`.
11. Given a selection whose status is `approved`. When the rival posts confirm. Then the status is 409 or 400, body `code` is `results.selection_not_confirmable`, and the status is not 500. File `apps/api/src/http/routes/encounters-selection.test.ts`.
12. Given a selected `ExternalReference` with no `ProviderMatch` row. When the rival posts confirm. Then the status is 409 or 404, body `code` is `results.provider_match_snapshot_missing`, and the status is not 500. File `apps/api/src/http/routes/encounters-selection.test.ts`.

### Notas

Wire HTTP after the existing use cases. Hide forbidden as 404. Map confirm tagged codes before they hit 500. Call `confirmOfficialSelectionAndProject`. Ship reject and dispute routes only after those use cases exist.

## [SDK] Métodos results/encounters en SDK

### Context

P0, Fase 4, Backend. Criteria. Typed SDK for candidates, selection, confirm, reject, and dispute. Zod contracts aligned to OpenAPI. Deps. The API task above.

`createResultsResource` today only has `listEncounterCandidates`. `createEncountersResource` is schedule snapshot and fixture, not official selection. Mobile and web BFF are supposed to go through `@futrob/sdk`.

### Key paths and symbols

- `packages/sdk/src/resources/results.ts` `createResultsResource`, `listEncounterCandidates`.
- `packages/sdk/src/resources/results.test.ts`.
- `packages/sdk/src/resources/encounters.ts` `createEncountersResource`.
- `packages/sdk/src/client.ts` `createFutrobClient` fields `results` and `encounters`.
- `packages/sdk/src/index.ts` `ResultsResource`, `EncountersResource`.
- `apps/web/src/context/product-api-client.ts` and `apps/web/src/shared/infrastructure/http/futrob-browser-client.ts`.
- `apps/web/src/context/create-authenticated-product-api-client.ts` used by BFF routes such as `apps/web/src/routes/api/v1/players/me/next-encounter.ts`.
- `apps/mobile/src/modules/api/futrob-client.ts`.

Keep results commands on `client.results`. Keep fixture edits on `client.encounters`. That matches the current split.

### Gaps

- No `selectOfficialMatches`, `confirmOfficialSelection`, `rejectOfficialSelection`, `proposeAlternativeOfficialSelection`, `openMatchDispute`, or `getOfficialResult` methods.
- No Zod request or response schemas in `@futrob/api-contracts` for those commands, so the SDK cannot parse them yet.
- No web BFF route under `apps/web/src/routes/api/v1/` that proxies encounter candidates or selection.
- `packages/sdk/src/resources/encounters.ts` name will confuse Match Center work. Document the split. Do not move fixture methods.

### Behavior tests

1. Given `mockFetch` that expects `POST .../encounters/encounter-1/official-selection` and returns `{ "id": "sel-1", "status": "awaiting_opponent_confirmation", "slots": [{ "officialSlot": 1, "providerMatchRef": { "providerKey": "ea-clubs", "externalId": "m-1" } }] }`. When `client.results.selectOfficialMatches("encounter-1", { selections: [...] })` runs. Then the resolved value `status` is `awaiting_opponent_confirmation` and `id` is `sel-1`. File `packages/sdk/src/resources/results.test.ts`.
2. Given a confirm response `{ "id": "result-1", "status": "approved", "revision": 1, "slots": [...] }`. When `client.results.confirmOfficialSelection("encounter-1")` runs. Then `revision` is 1 and `status` is `approved`. File `packages/sdk/src/resources/results.test.ts`.
3. Given a 404 body `{ "code": "results.encounter_not_found" }`. When `selectOfficialMatches` runs. Then the SDK throws `FutrobApiError` whose `code` is `results.encounter_not_found`. File `packages/sdk/src/resources/results.test.ts`.
4. Given `rejectOfficialSelection` and `openMatchDispute` on the resource. When each is called with a valid body. Then fetch uses `POST` on `/encounters/encounter-1/official-selection/reject` and `/encounters/encounter-1/disputes`. File `packages/sdk/src/resources/results.test.ts`.
5. Given a confirm payload with `status` `"done"`. When the parse function runs. Then Zod throws. File `packages/sdk/src/resources/results.test.ts`.
6. Given the existing candidates tests. When this change lands. Then `listEncounterCandidates` still requests `GET /encounters/encounter-1/candidates`. File `packages/sdk/src/resources/results.test.ts`.

### Notas

Do not add results mutations onto `EncountersResource`. Wait for the API contracts. Mirror `listEncounterCandidates` parse-at-boundary.

## [UI] Pantallas Match Center del enfrentamiento

### Context

P0, Fase 2, Frontend. Criteria. Screens show schedule, rivals, slots, candidates, confirmation state, and audit. Actions come from the verified participating Team. Deps. Diseñar Match Center del enfrentamiento. SDK methods.

`design.md` already specifies the resource, header, seven sections, and UX-MAT-001 through UX-MAT-008. `apps/web` has no encounter detail route. `apps/mobile/src` has identity and primitives only.

### Key paths and symbols

- `design.md` Match Center (recurso central). Route `/orgs/:orgId/competitions/:competitionId/encounters/:encounterId`.
- `design.md` UX-MAT-001 to UX-MAT-008, UX-NAV-006, UX-SCP-004, UX-SCP-005.
- `apps/web/src/shared/presentation/shell/nav-registry.ts` competition `encounters` and `fixture` items with `stub: true`.
- `apps/web/src/shared/presentation/shell/queue-task-item.stories.tsx` href `/orgs/org_1/competitions/cmp_1/encounters/enc_1/selection`. That nested `/selection` path is not a route.
- `apps/web/src/context/product-api-encounter-reader.ts` `encounters.getScheduleSnapshot`. Not a UI screen.
- `apps/web/src/modules/player-home/presentation/home-hero.tsx`. Next Encounter CTA goes to `/player/competitions`.
- `apps/web/src/modules/results/index.ts` re-export only.
- `apps/web/src/modules/statistics/presentation/` player matches. That is personal `ProviderMatch` UI, not Match Center.
- `apps/web/src/routes/api/v1/players/me/next-encounter.ts`. Next Encounter card, not the center.
- `apps/api/src/adapters/authorization/contextual-authorization.adapter.ts` encounter baseline for captain, vice_captain, and player.
- `product/acceptance-criteria.md` AC-EA-001, AC-SEL-001, AC-SEL-002.
- `product/mvp-requirements.md` FR-11, FTR-SEL-001, FTR-WEB-002.

Gate actions with EffectiveAccess `can` and `RESULT_PERMISSION` constants. Do not compare roster role strings in React.

### Gaps

- No web route file for the conceptual Match Center URL.
- Shell labels Enfrentamientos and Calendario as disabled stubs. They are not Match Center.
- `queue-task-item` stories use `/encounters/enc_1/selection`. `design.md` uses the Encounter id as the resource, with tabs, not a nested `/selection` route. Pick one before UI lands.
- Competition home is a coming-soon page. Teams under the same competition is a real console. Participant verification exists there, not on Match Center.
- No presentation components under `apps/web/src/modules/results/presentation/`.
- No Storybook for Match Center.
- No BFF proxy for candidates or selection, so the UI cannot call `apps/api` even after the SDK grows.
- Mobile has no Expo route that reuses the same ids.
- Participating Team is already enforced in the authorization adapter. UI still needs a loader that fails closed when `encounters.official-selection.propose` is absent.
- Audit and dispute tabs have no data API yet.

### Behavior tests

1. Given a captain session and a loader that returns two candidates and `allowed` containing `encounters.official-selection.propose`. When the page at `/orgs/org-1/competitions/comp-1/encounters/enc-1` renders. Then both team names, kickoff, two official slots, and a propose control with accessible name are in the document. File `apps/web/src/modules/results/presentation/match-center-page.test.tsx`.
2. Given a player roster role on a participating Team, `allowed` with `encounters.read` only. When the same page renders. Then candidates may be hidden or read-only and no propose, confirm, or dispute button is present. File `apps/web/src/modules/results/presentation/match-center-page.test.tsx`.
3. Given `status` `clubs_not_connected` and `sides` `["away"]`. When the EA candidates section renders. Then the empty copy names the away club connection, not a generic void. File `apps/web/src/modules/results/presentation/match-center-candidates.test.tsx`.
4. Given five candidate rows with hour, score, duration, sides, and `completeness` `partial`. When the list renders. Then all five stay unofficial and the partial flag is visible. File `apps/web/src/modules/results/presentation/match-center-candidates.test.tsx`. This covers AC-EA-001.
5. Given a selection `awaiting_opponent_confirmation` proposed by the other captain. When the rival captain views Official matches and Selection. Then confirm and reject controls are present and propose is not the primary action. File `apps/web/src/modules/results/presentation/match-center-selection.test.tsx`. This covers UX-MAT-007.
6. Given no permission to read the Encounter. When the route loads. Then the user sees the 403 pattern, not an empty Match Center. File `apps/web/src/routes/_app/orgs/$orgId/competitions/$competitionId/encounters/$encounterId.test.tsx`. This covers UX-NAV-007.
7. Given `design.md` and the `queue-task-item` story href. When the Match Center page is registered. Then the route is `/orgs/:orgId/competitions/:competitionId/encounters/:encounterId` with tabs, not a nested `/selection` path. File `apps/web/src/routes/_app/orgs/$orgId/competitions/$competitionId/encounters/$encounterId.test.tsx`.

### Notas

Post-design UX. Compose from `@futrob/ui`. Keep EA candidates visually distinct from official slots. Block on SDK plus a thin BFF proxy.

## [Domain] Asociación persistida de candidatos + recálculo tras reprogramación

### Context

P0, Fase 4, Backend. Criteria. EA candidates associated persistently to the Encounter. Idempotent recalc after reschedule. Integrity with selection. Deps. Detectar candidatos EA para un enfrentamiento.

Detection already exists as a computed read. `RepositoryProviderMatchReader.listCandidatesForEncounter` lists `provider_matches` between the two connected clubs inside `candidateWindowFor`. OpenAPI text says "persisted provider-match candidates". The matches are persisted. The association to the Encounter is not.

DEC-024. Keep prior candidates. Recalculate eligibility and window with the new kickoff. DEC-023. Default window plus or minus 6 hours, configurable 1 to 24. Code uses a fixed 18 hour half-window.

### Key paths and symbols

- `packages/results/src/application/list-encounter-candidates/list-encounter-candidates.use-case.ts` `ListEncounterCandidatesUseCase`.
- `packages/results/src/domain/policies/candidate-window.ts` `candidateWindowFor`, `CANDIDATE_WINDOW_HALF_HOURS`.
- `packages/results/src/domain/ports/provider-match-reader.port.ts` `CandidateMatchQuery`, `listCandidatesForEncounter`.
- `apps/api/src/adapters/results/bridges.ts` `RepositoryProviderMatchReader`, `SchedulingEncounterReader`.
- `apps/api/src/adapters/results/bridges.test.ts`.
- `apps/api/src/http/routes/encounters.test.ts` window boundary HTTP test.
- `apps/api/migrations/0019_provider_observations_and_matches.sql` `UNIQUE (provider_key, external_match_id)`.
- `packages/scheduling/src/domain/events/encounter-rescheduled.event.ts` `scheduling.encounter-rescheduled`.
- `packages/scheduling/src/application/edit-fixture-encounter.use-case.ts` publisher of that event. It rematerializes `official_matches` as `scheduled`.
- `packages/scheduling/src/application/create-schedule-change-request.use-case.ts` exists. No accept or apply-reschedule consumer was found.
- `apps/api/migrations/0021_official_matches.sql` slot shells. Not candidate rows.
- `apps/api/src/adapters/scheduling/fixture-editing.adapters.ts` `OfficialResultFixtureEditGuard`.
- `docs/architecture/dependency-graph.md` sequence reschedule to candidates. Describes outbox invalidation and a new sync. No consumer implements it.
- `product/open-decisions.md` DEC-023, DEC-024, DEC-025.

### Gaps

- No `encounter_candidates` (or equivalent) table keyed by `encounter_id` plus `provider_key` plus `external_match_id`.
- No use case that upserts associations. `ListEncounterCandidatesUseCase` only reads.
- No consumer of `scheduling.encounter-rescheduled` in results. Captain schedule-change requests also have no apply step, so kickoff may never move through that path yet.
- `SelectOfficialMatchesUseCase` does not require the ref to be an associated candidate.
- `OfficialResultFixtureEditGuard` returns false when a non-voided selection exists, so captain reschedule after a proposal is blocked. Recalc after reschedule is then only reachable before selection, unless the guard is narrowed.
- Window half-width 18 hours disagrees with DEC-023 default 6 hours.
- `official_match_selections` has no `organization_id`, so adapter tenancy is encounter-id only.

Do not copy `ProviderMatch` into results. Persist the association. Keep the observation in game-data.

### Behavior tests

1. Given both clubs connected and three `ProviderMatch` rows, two inside the window and one outside. When `ListEncounterCandidatesUseCase` runs after a persist-association step. Then the stored association count is 2 and the ready payload `candidates` length is 2 with those `externalId` values. File `packages/results/src/application/associate-encounter-candidates/associate-encounter-candidates.use-case.test.ts`.
2. Given those two association rows. When the same associate command runs again with the same matches. Then row count stays 2 and primary keys do not change. File `packages/results/src/application/associate-encounter-candidates/associate-encounter-candidates.use-case.test.ts`.
3. Given associations for kickoff `T` and a later `scheduling.encounter-rescheduled` to `T+24h`. When recalc runs. Then rows that leave the new window stay stored with eligibility false, new in-window matches insert, and selected `ExternalReference` values are unchanged. File `packages/results/src/application/recalculate-encounter-candidates/recalculate-encounter-candidates.use-case.test.ts`. This covers DEC-024.
4. Given a second identical reschedule event. When recalc runs again. Then no extra rows and eligibility flags match the first recalc. File `packages/results/src/application/recalculate-encounter-candidates/recalculate-encounter-candidates.use-case.test.ts`.
5. Given a selected ref that is no longer eligible after recalc. When `SelectOfficialMatchesUseCase` is asked to propose a different ineligible ref. Then the error code is `results.invalid_selection` or a new tagged `results.candidate_not_associated`. The original selection row still has the old ref. File `packages/results/src/application/select-official-matches/select-official-matches.use-case.test.ts`.
6. Given `candidateWindowFor(new Date("2026-09-14T20:00:00.000Z"))`. When the product default is implemented. Then `from` is `2026-09-14T14:00:00.000Z` and `to` is `2026-09-15T02:00:00.000Z` if DEC-023 6 hours wins, or keep 18 hours only after an explicit product decision. File `packages/results/src/domain/policies/candidate-window.test.ts`.

### Notas

Hueco in candidate notes is real. Persist associations in results adapters. Recalc from the reschedule event. Do not put EA types in `packages/results`.

## [Domain] Rechazo, selección alternativa y disputa completa

### Context

P0, Fase 4, Backend. Criteria. Rival can reject, propose an alternative, and open a dispute. Organizer reviews. Full audit. HTTP and UI consumable. Deps. Confirmación rival y disputas WIP. API endpoints.

Confirm exists and auto-approves in one step. Glossary `ConfirmationAction` is propose, confirm, reject, counter-proposal. `SelectionStatus` already includes `disputed` and `organizer_review`. Nothing writes those states. Catalog lists `results.match-dispute-opened` with no publisher.

### Key paths and symbols

- `packages/results/src/domain/value-objects/selection-status.ts` `SelectionStatus`.
- `packages/results/src/domain/entities/official-match-selection.ts` `OfficialMatchSelection`.
- `packages/results/src/application/confirm-official-selection/confirm-official-selection.use-case.ts`.
- `packages/results/src/application/select-official-matches/select-official-matches.use-case.ts`. A new propose currently inserts another row. `findLatestByEncounter` returns the newest `proposed_at`.
- `packages/results/src/domain/errors/official-result.errors.ts` `SelectionNotConfirmable`.
- `apps/web/src/shared/contracts/events/catalog.ts` `officialSelectionConfirmed`, `matchDisputeOpened`.
- `docs/architecture/module-boundaries.md` event list.
- `product/domain-glossary.md` `ConfirmationAction`, `MatchDispute`, suggested selection states.
- `product/acceptance-criteria.md` AC-SEL-001, AC-SEL-002.
- `product/open-decisions.md` DEC-020, DEC-021, DEC-022.
- `product/mvp-requirements.md` FTR-SEL-001, FR-15.

Hexagonal shape. New use cases under `packages/results/src/application/` such as `reject-official-selection`, `propose-alternative-official-selection`, `open-match-dispute`, `resolve-match-dispute`. `MatchDispute` entity in `packages/results/src/domain/entities/`. Expected failures as `TaggedError` with stable `code`.

### Gaps

- No reject use case. No alternative-selection use case. No dispute entity or repository.
- Confirm does not require a different team than `proposedByActorId`. DEC-022 two-captain agreement is not modeled. One resolve permission approves immediately.
- Confirm skips status `confirmed` and does not emit `results.official-selection-confirmed`. Confirm currently allows input status `organizer_review`. No use case writes `organizer_review` or `disputed`.
- Preview before save (FTR-SEL-002) has no domain use case. UI can preview from candidate DTOs.
- `SelectOfficialMatchesUseCase` always starts a new id. Alternative propose has no rule for incompatible slots versus an open proposal.
- No expiry for DEC-021 (24 hours or until kickoff).
- No integrity flags that block auto-approve.
- HTTP and UI cannot consume these commands yet. This task still owns the domain state machine they will call.
- Audit is a later P1 task. Domain should emit enough data for before and after without writing SQL.

### Behavior tests

1. Given selection `awaiting_opponent_confirmation` proposed by captain A. When captain B rejects. Then latest selection `status` is `selection_in_progress` or `disputed` per the chosen machine, `OfficialResult` is absent, and event `results.official-matches-selected` is not re-emitted as approved. File `packages/results/src/application/reject-official-selection/reject-official-selection.use-case.test.ts`.
2. Given that proposal. When captain B proposes a different slot set. Then status becomes `organizer_review` or `disputed`, no `OfficialResult` is saved, and statistics are not projected. File `packages/results/src/application/propose-alternative-official-selection/propose-alternative-official-selection.use-case.test.ts`. This covers AC-SEL-002.
3. Given two captains who post the same slot set. When the second confirm runs and completeness is `complete`. Then one `OfficialResult` with `revision` 1 and status `approved` exists, and `results.official-result-approved` is published once. File `packages/results/src/application/confirm-official-selection/confirm-official-selection.use-case.test.ts`. This covers DEC-022 and AC-SEL-001.
4. Given captain A as proposer. When captain A confirms their own proposal without organizer permission. Then the error is `results.selection_not_confirmable` or `results.official_result_forbidden`. File `packages/results/src/application/confirm-official-selection/confirm-official-selection.use-case.test.ts`.
5. Given `disputed`. When an organizer with `encounters.results.approve` resolves for A's slots. Then `OfficialResult.status` is `approved` and `results.match-dispute-opened` had already been published on open. File `packages/results/src/application/resolve-match-dispute/resolve-match-dispute.use-case.test.ts`.
6. Given `approved`. When anyone rejects. Then `SelectionNotConfirmable` (or a new tagged code) and the approved snapshot is unchanged. File `packages/results/src/application/reject-official-selection/reject-official-selection.use-case.test.ts`.
7. Given a switch over `SelectionStatus`. When a new variant is added. Then the default `never` check fails to compile. File a `*.test-d.ts` or exhaustive helper next to `selection-status.ts`.

### Notas

Completes the confirmation WIP. Encode the state machine in `SelectionStatus` plus `MatchDispute`. Do not auto-approve on a single resolve.

## [Domain] Avance ganador / clasificado / bracket

### Context

P0, Fase 4, Backend. Criteria. After an approved `OfficialResult`, advance winner, qualifier, or bracket according to stage rules. Pure league and pure cup must not regress. Deps. Calcular resultado individual y marcador agregado.

Confirm already snapshots goals per slot into `OfficialResultSlotSnapshot`. `ProjectOfficialResultUseCase` rebuilds standings and player or team contributions. `FixturePlan` generation already inserts `FixtureParticipantSlot` values of kind `winner`, `group-rank`, and `stage-rank`. Nothing fills those placeholders after a result.

Scheduling owns the fixture graph. Results owns what counted. Advancement should live in scheduling (or a dedicated application service in scheduling) that reads `OfficialResultReaderPort`. Do not write fixture tables from `packages/results`.

### Key paths and symbols

- `packages/results/src/domain/entities/official-result.ts` `OfficialResult`, `OfficialResultSlotSnapshot`.
- `packages/results/src/application/confirm-official-selection/confirm-official-selection.use-case.ts`.
- `packages/statistics/src/application/project-official-result/project-official-result.use-case.ts` `ProjectOfficialResultUseCase`.
- `packages/statistics/src/domain/policies/build-competition-standings.ts`.
- `packages/scheduling/src/domain/entities/fixture-plan.ts` `FixtureParticipantSlot`, `FixtureEncounter`, `FixtureFormat`.
- `packages/scheduling/src/domain/policies/generate-fixture-plan.ts` winner slot creation.
- `packages/scheduling/src/domain/policies/arrange-opening-knockout-slots.ts`.
- `packages/competitions/src/domain/entities/competition-rules.ts` `regularStage`, `knockoutStage`.
- `packages/competitions/src/application/create-competition-draft/create-competition-draft.use-case.ts` league vs knockout match rules.
- `apps/api/src/adapters/scheduling/fixture-editing.adapters.ts` `OfficialResultOccupancyGuard`.
- `product/open-decisions.md` DEC-017 tie in elimination.
- `product/domain-glossary.md` `Bye`, `Bracket`, `Standing`.
- `design.md` UX-BRK-002 byes must not show fake scores.

### Gaps

- No use case that, on `results.official-result-approved`, replaces a downstream `winner` slot with `{ kind: "team", teamId }`.
- No qualifier promotion from group standings into `group-rank` slots after the group stage completes.
- League path already updates standings via statistics. That must stay the only competitive write for `format: "league"`.
- Series resolution (`independent_matches` vs `aggregate_score`) is on `FixtureSeries` and competition rules. Confirm stores per-slot goals and does not compute a series winner.
- Void path unprojects stats. It does not unwind a filled bracket slot.
- DEC-017 organizer review on missing tie-break data has no code.
- Web statistics worker is unimplemented. API composition already projects on confirm. Bracket advance should hook the same composition point or consume the outbox, not the stub worker.

### Behavior tests

1. Given a knockout Encounter whose next round away slot is `{ kind: "winner", encounterId: "enc-1" }` and an approved `OfficialResult` where home scored more aggregate goals. When advance runs. Then that away slot is `{ kind: "team", teamId: homeTeamId }` and the league standings table is unchanged. File `packages/scheduling/src/application/advance-fixture-from-official-result/advance-fixture-from-official-result.use-case.test.ts`.
2. Given `format: "league"` and the same approved result. When advance runs. Then no `FixtureParticipantSlot` mutates and standings still come only from `ProjectOfficialResultUseCase`. File `packages/scheduling/src/application/advance-fixture-from-official-result/advance-fixture-from-official-result.use-case.test.ts`.
3. Given a bye slot. When the adjacent Encounter is approved. Then the bye remains `{ kind: "bye" }` with no fabricated score. File `packages/scheduling/src/application/advance-fixture-from-official-result/advance-fixture-from-official-result.use-case.test.ts`.
4. Given aggregate_score series 1-1 on slots then 2-0. When advance runs. Then the winner is the team with aggregate 3-1, not the team that won more official matches. File `packages/scheduling/src/application/advance-fixture-from-official-result/advance-fixture-from-official-result.use-case.test.ts`.
5. Given an approved result later voided. When unadvance runs. Then the downstream slot returns to `{ kind: "winner", encounterId: "enc-1" }` and occupancy `hasApprovedOfficialResult` is false. File `packages/scheduling/src/application/advance-fixture-from-official-result/advance-fixture-from-official-result.use-case.test.ts`.
6. Given an elimination draw with no configured tie-break data. When advance runs. Then a tagged error such as `scheduling.tie_requires_organizer_review` and no slot write. File `packages/scheduling/src/application/advance-fixture-from-official-result/advance-fixture-from-official-result.use-case.test.ts`. This covers DEC-017.

### Notas

Hueco in result-calculation notes. Compute series winner in results or a pure policy, then let scheduling fill slots. Do not advance from unapproved candidates.

## [Data] Auditoría de cambios de selección/confirmación

### Context

P1, Fase 4, Data. Criteria. Every selection, confirmation, and dispute change is audited with actor, timestamp, and sanitized before and after. Deps. Domain reject, alternative, and full dispute.

Organizations already append authorization audit. Scheduling already appends fixture edit audit with `requestId` idempotency. Results does not. `official_match_selections` upserts by `id` and overwrites `status` and `slots`. Confirm mutates the latest selection row. That is not an append-only before and after log. Sentry rules forbid sending selection or dispute free text.

### Key paths and symbols

- `apps/api/migrations/0022_official_results.sql` `official_match_selections`, `official_results`.
- `apps/api/src/adapters/results/official-result.repository.ts` `PostgresOfficialMatchSelectionRepository.save` `ON CONFLICT (id) DO UPDATE`.
- `packages/organizations/src/application/manage-roles/manage-roles.use-case.ts` `audit.append`.
- `packages/scheduling/src/application/edit-fixture-encounter.use-case.ts` `FixtureAuditPort`.
- `.cursor/rules/sentry.mdc` redaction of selection and dispute free text.
- `product/mvp-requirements.md` FR-15, FTR-SEL-003.
- `product/acceptance-criteria.md` AC-SEL-003 uniqueness of an already approved provider match.

Hexagonal shape. Domain port `OfficialSelectionAuditPort.append`. Postgres adapter in `apps/api`. Do not import D1 or Sentry from `packages/results`.

### Gaps

- No results audit table and no append port.
- Overwrite of selection status loses previous slots unless a new row was inserted for a new propose.
- Confirm does not store a before image.
- Dispute free text has nowhere to live, so sanitization is unspecified.
- FTR-SEL-003 change of an approved selection needs permission plus audit. There is no such command.
- Replay of confirm currently creates revision 2 in unit tests. Audit rows would duplicate without an idempotency key.

### Behavior tests

1. Given no prior selection. When captain A proposes slots `[m-1]`. Then one audit row has `actorId` A, `action` `propose`, `before` `null`, `after.slots[0].providerMatchRef.externalId` `"m-1"`, and `occurredAt` the clock instant. File `packages/results/src/application/select-official-matches/select-official-matches.use-case.test.ts`.
2. Given that proposal. When rival confirms. Then a second row has `action` `confirm`, `before.status` `"awaiting_opponent_confirmation"`, `after.status` `"approved"`, and no provider payload blob. File `packages/results/src/application/confirm-official-selection/confirm-official-selection.use-case.test.ts`.
3. Given a dispute reason `"call me at +1-555-0100"`. When the dispute opens. Then stored after-image reason is a safe token or redacted string, not the phone number. File `apps/api/src/adapters/results/official-selection-audit.repository.test.ts`.
4. Given the same confirm replay with the same request id. When confirm runs twice. Then audit row count for that request id stays 1. File `apps/api/src/adapters/results/official-selection-audit.repository.test.ts`.
5. Given an `ea-clubs` id already approved on Encounter 1. When Encounter 2 tries to select it. Then the command fails with a tagged uniqueness error and an audit row records the attempt. File `packages/results/src/application/select-official-matches/select-official-matches.use-case.test.ts`. This covers AC-SEL-003.

### Notas

Follow fixture `requestId` idempotency. Sanitize in the adapter. Keep raw EA payloads out of the audit row.

## [QA] Integración selección→confirmación→OfficialResult

### Context

P1, Fase 4, QA. Criteria. Integration tests cover selection to confirmation to `OfficialResult` for the happy path and typed rejections. Deps. API endpoints. Domain reject, alternative, and dispute.

Today `results-smoke` runs select then confirm against in-memory fakes and checks two event names. HTTP integration in `encounters.test.ts` covers candidate listing and 404 hide only. `confirm-official-selection.use-case.test.ts` asserts a second confirm becomes `revision` 2, which is the opposite of NFR-02.

### Key paths and symbols

- `apps/cli/src/commands/results-smoke.ts`.
- `apps/api/src/http/routes/encounters.test.ts`.
- `apps/api/src/http/http-app.harness.ts` `serviceHeaders`.
- `apps/api/src/di/create-modules.ts` `confirmOfficialSelectionAndProject`.
- `packages/results/src/application/select-official-matches/select-official-matches.use-case.test.ts`.
- `packages/results/src/application/confirm-official-selection/confirm-official-selection.use-case.test.ts`.
- `packages/results/src/application/void-official-result/void-official-result.use-case.test.ts`.
- `apps/api/src/adapters/authorization/rbac-matrix.test.ts` encounter family.
- `.cursor/rules/testing.mdc` pyramid, fake ports, two-organization isolation, replay must not duplicate effects.

### Gaps

- No HTTP test posts selection or confirm.
- No two-organization isolation test for official results.
- No assert that `ProjectOfficialResultUseCase` wrote a contribution after HTTP confirm.
- `results-smoke` never calls the API or Postgres.
- CLI has no `select` or `confirm` live command beside the smoke.
- Current confirm unit test encodes non-idempotent revision bumps. QA should treat that as a defect to flip, not a fixture to copy.
- `NoopEventPublisher` swallows events in `create-modules`. HTTP integration should assert response body plus Postgres rows, not a durable outbox, until the publisher is real.
- `VoidOfficialResultUseCase` already converges on replay. Confirm should match that shape.

### Behavior tests

1. Given org A, two connected clubs, one in-window `ProviderMatch`, captain A and captain B on opposite Teams. When A posts selection and B posts confirm through `createApp`. Then HTTP 200, `official_results.status` is `approved`, `revision` is 1, and `player_match_contributions` has one row for `externalPlayerId` of that match. File `apps/api/src/http/routes/encounters-official-result.integration.test.ts`.
2. Given that approved Encounter. When B posts confirm again. Then HTTP 200, still `revision` 1, still one contribution row. File `apps/api/src/http/routes/encounters-official-result.integration.test.ts`.
3. Given the same headers against org B's Encounter id. When A posts selection. Then 404 `results.encounter_not_found` and org B tables are empty of A's selection. File `apps/api/src/http/routes/encounters-official-result.integration.test.ts`.
4. Given awaiting confirmation. When B posts reject. Then HTTP 200 or 409 per the domain contract, `official_results` has no approved row, and body `code` is absent or a stable `results.*` code, never a stack string. File `apps/api/src/http/routes/encounters-official-result.integration.test.ts`.
5. Given slot count mismatch. When A posts selection. Then 400 `results.invalid_selection`. File `apps/api/src/http/routes/encounters-official-result.integration.test.ts`.
6. Given duplicate provider ref across slots. When A posts selection. Then 400 `results.duplicate_provider_match`. File `apps/api/src/http/routes/encounters-official-result.integration.test.ts`.
7. Given missing provider snapshot at confirm. When B confirms. Then 409 or 404 `results.provider_match_snapshot_missing` and no official row. File `apps/api/src/http/routes/encounters-official-result.integration.test.ts`.
8. Given `npm run cli -- results-smoke`. When it still uses fakes. Then keep it as a domain smoke, and add a live CLI path only after HTTP exists. File `apps/cli/src/commands/results-smoke.ts` plus a new `apps/cli` HTTP command test documented in `/apps/cli/README.md`.

### Notas

Pyramid. Keep use-case tests on fake ports. Add one HTTP integration file that proves select, confirm, OfficialResult, projection, isolation, and typed errors.
