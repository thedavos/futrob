# QA del flujo competitivo

Research only. No product code. Input: Notion epic **QA del flujo competitivo** (board Infraestructura, Fase 5). Product source of truth: `AC-E2E-001` in [`product/acceptance-criteria.md`](/product/acceptance-criteria.md).

This note answers how Futrob tests the competitive path today, what is missing for the five Notion tasks, and which behavior tests to add. A machine-readable catalog lives in [`qa-flujo-competitivo.tests.json`](./qa-flujo-competitivo.tests.json).

## Overview

The Must competitive journey is one chain: create organization and competition, generate fixture, reschedule a slot, sync EA candidates, propose official selection, confirm, resolve the series, then project standings and rankings. `AC-E2E-001` also requires two-organization isolation, immutable provider payloads, and no duplicate effects on sync or confirm replay.

The repo already has a strong pyramid **below** that chain. Domain and application tests cover pieces with in-memory fakes. HTTP tests cover fixture generation, candidate listing, and internal sync-job dedupe. Nothing drives the full Must matrix as one E2E, on a schedule, or on native mobile.

## Key concepts

**E2E Must matrix.** The Notion acceptance line is creación, reprogramación, sync EA, selección, confirmación, agregado, tabla y rankings. That is `AC-E2E-001` plus `AC-SCH-001`, `AC-EA-001`, `AC-SEL-001`, `AC-FIX-002`, and `AC-RNK-001`.

**Provider down, duplicates, race.** `NFR-02` and `AC-SEC-002` say a replayed sync job, confirmation, or outbox event must not duplicate business effects. `AC-SEL-003` says an already approved provider match id cannot fill another OfficialMatch.

**OpenAPI contract tests.** Zod in `@futrob/api-contracts` is the source. `npm run generate:openapi` writes `packages/api-contracts/openapi/openapi.yaml`. ADR-0005 says CI should fail on drift when that check exists. It does not exist yet.

**Nightly E2E.** A scheduled job that runs the Must matrix and reports failures. It must not block pull requests unless the team agrees otherwise.

**Mobile competitive subset.** Native iOS and Android proof of the captain happy path, or a documented skip until Match Center UI and the mobile smoke exist. Expo web is not that proof (`AC-MOB-*`).

## How the current test layout works

```text
CI on push/PR (.github/workflows/ci.yml)
  check     npm run check
  typecheck npm run typecheck
  test      playwright chromium + npm run test:coverage
  build     npm run build + bundle:budget

Not in CI
  scheduled E2E
  generate:openapi drift
  TEST_DATABASE_URL Postgres suites (they skip)
  apps/mobile tests (not a Vite+ project)
  CLI e2e-golden-path
  verify-futrob browser recipes
```

Vitest via Vite+ is the only automated runner (`npm test` / `npm run test:coverage`). Playwright is installed so Storybook stories can run in Chromium. It is not a product E2E suite.

The coverage gate that matches the testing rule is in `apps/web/vite.config.ts`: 80% lines, functions, branches, and statements on domain, application, and registry adapters. Root `vite.config.ts` uses lower floors (statements 72, branches 65, functions 69, lines 74).

The CLI golden path stops at fixture:

```text
meta.ping → organizations.create → competitions.createDraft
  → teams.createTeam ×2 → registerTeamEntry ×2 → approve ×2
  → competitions.publish → encounters.generateFixture
```

`verify-futrob` maps landing, auth, player onboarding, player matches, and competition setup. Its README lists Match Center, official selection, confirmation, native mobile, and the public portal as unmapped.

## Where things live

| Layer | Path |
| --- | --- |
| Product ACs | `product/acceptance-criteria.md` (`AC-E2E-001`, `AC-SCH-*`, `AC-EA-*`, `AC-SEL-*`, `AC-SEC-002`, `AC-MOB-*`) |
| CI | `.github/workflows/ci.yml`, `health-check.yml` (cron commented; production ping only) |
| CLI golden path | `apps/cli/src/commands/e2e-golden-path.ts` |
| Offline results smoke | `apps/cli/src/commands/results-smoke.ts` |
| Browser recipes | `.cursor/skills/verify-futrob/features/` |
| Select / confirm use cases | `packages/results/src/application/select-official-matches/`, `confirm-official-selection/` |
| Reschedule request | `packages/scheduling/src/application/create-schedule-change-request.use-case.ts` |
| Provider failure policy | `packages/game-data/src/domain/policies/classify-provider-failure.ts` |
| Sync job execute | `packages/game-data/src/application/execute-provider-sync-job/` |
| UNIQUE match identity | `apps/api/migrations/0019_provider_observations_and_matches.sql` |
| OpenAPI document | `packages/api-contracts/src/v1/openapi/document.ts` |
| HTTP candidates | `apps/api/src/http/routes/encounters.ts` `GET /encounters/:id/candidates` |
| HTTP fixture | `apps/api/src/http/routes/fixtures.ts` |
| HTTP standings | `apps/api/src/http/routes/competitions.ts` `GET .../standings` and `.../rankings` |
| SDK results | `packages/sdk/src/resources/results.ts` (`listEncounterCandidates` only) |
| Mobile | `apps/mobile/` (auth foundation; `src/modules/identity/auth-validation.test.ts`) |
| Public portal package | `packages/public-portal/src/index.ts` (empty public API) |

---

## 1. Matriz E2E Must del flujo competitivo

- Notion: [Matriz E2E Must del flujo competitivo](https://app.notion.com/p/3dc7b204009a81f8b900cfcb6136b122)
- Tipo QA, P0. Deps: parent card [Crear pruebas end-to-end del flujo competitivo](https://app.notion.com/p/3a07b204009a817f93abe626a9511104); Resultados and Reprogramaciones flows.
- Acceptance: matriz completa. creación, reprogramación, sync EA, selección, confirmación, agregado, tabla y rankings.

### Context

CI never runs `e2e-golden-path` or `verify-futrob`. Those are operator recipes.

Closest automated chain today:

1. HTTP `apps/api/src/http/routes/fixtures.test.ts` generates a fixture, replays generation, reads the plan, and audits a schedule edit.
2. HTTP `GET /api/v1/encounters/:encounterId/candidates` returns windowed candidates and hides another organization's encounter as `404 results.encounter_not_found`.
3. Application `SelectOfficialMatchesUseCase` persists `awaiting_opponent_confirmation`.
4. Application `ConfirmOfficialSelectionUseCase` writes an approved `OfficialResult` and emits `results.official-result-approved`.
5. Application `ProjectOfficialResultUseCase` updates contributions from approved results.

Those tests do not share one fixture. They do not open a browser. They do not call missing HTTP for selection, confirmation, or captain reschedule requests.

Web shell already registers a standings nav href (`apps/web/src/shared/presentation/shell/nav-registry.ts`). There is no Match Center route or results presentation under `apps/web/src/modules`.

### Paths and symbols

- `run` in `apps/cli/src/commands/e2e-golden-path.ts`
- `ConfirmOfficialSelectionUseCase.execute`
- `SelectOfficialMatchesUseCase.execute`
- `CreateScheduleChangeRequestUseCase.execute`
- `ListEncounterCandidatesUseCase.execute`
- `GetCompetitionStandingsUseCase` / `GetCompetitionRankingsUseCase` (wired in `apps/api/src/di/statistics.module.ts`)
- Event names in `apps/web/src/shared/contracts/events/catalog.ts`: `results.official-result-approved`, `scheduling.reschedule-requested`

### Gaps

- No single test implements `AC-E2E-001` as one journey.
- No E2E for captain reschedule of slot 2 only (`AC-SCH-001`). HTTP can edit a fixture encounter as organizer. Captain `CreateScheduleChangeRequestUseCase` has no HTTP route.
- No E2E that syncs EA, lists five candidates, and asserts they are not official (`AC-EA-001`).
- No HTTP or UI for propose and confirm (`SelectOfficialMatchesUseCase` / `ConfirmOfficialSelectionUseCase` are package-only). Notion card [API Endpoints selección / confirmación / disputa](https://app.notion.com/p/3dc7b204009a812d8f2ec66662d3a161) is Not started.
- No E2E for independent vs aggregate series (`AC-FIX-002`).
- No HTTP test for `GET .../standings` or `GET .../rankings`. Grep finds no `apps/api/src/http` test for those paths.
- Public portal BC exports nothing. `AC-WEB-003` cannot be driven.
- Two-org isolation exists as RBAC cases and one candidates 404, not as a full competitive E2E (`AC-SEC-001`).

### Behavior tests

Add these as one orchestrated suite (CLI against live `apps/api`, then later `verify-futrob` once Match Center exists). Each case calls the product the way an operator or captain does and asserts a literal result.

1. **Create through fixture.** After `e2e-golden-path`, `encounterCount` is `1` for a two-team single round-robin, and `GET` fixture returns that plan id twice with the same encounter ids.
2. **Reschedule slot 2 only.** Given two OfficialMatch slots pending, a captain `POST` schedule-change for slot 2 that the rival accepts. `GET` snapshot shows slot 1 `scheduledStartAt` unchanged and slot 2 equal to the proposed ISO time. (`AC-SCH-001`. Blocked on reschedule HTTP.)
3. **Sync does not officialize.** After enqueue and run of a recent-matches job, `GET /encounters/{id}/candidates` returns `status: "ready"` with five candidates and no `OfficialResult` row for the encounter.
4. **Propose then confirm.** Captain A `POST` selection `{ officialSlot: 1, providerMatchRef: { providerKey: "ea-clubs", externalId: "m-1" } }`. Captain B confirms. `GET` standings includes home goals `2` from that snapshot. Event `results.official-result-approved` is emitted once. (`AC-SEL-001`. Blocked on results HTTP.)
5. **Aggregate series.** OfficialMatch scores 2-0 and 1-3. Standings or series winner is B on 3-4. (`AC-FIX-002`.)
6. **Tabla vs ranking.** After one approved result, `GET .../standings` `formulaVersion` is the competition table formula and `GET .../rankings` uses the performance ranking formula. The two payloads are not equal. (`AC-RNK-001`.)
7. **Cross-org read.** Actor of org B `GET` org A encounter candidates. Status `404` and body `code` is `results.encounter_not_found`. No candidate list. (`AC-SEC-001`.)
8. **Replay sync and confirm.** Re-run the same job id and the same confirm. Provider ingest call count stays `1`. OfficialResult count stays `1`. Standings `sourceRevisionMax` is unchanged. (`AC-E2E-001` last paragraph, `AC-SEC-002`.)

### Notas

Extend `e2e-golden-path` in steps after each HTTP lands. Do not wait for Match Center UI to start the API matrix. Parent Notion notes already say to include provider errors and duplicates (task 2). Nightly (task 5) should invoke this suite, not a different script.

---

## 2. Casos proveedor caído, duplicados, race

- Notion: [Casos proveedor caído / duplicados / race](https://app.notion.com/p/3dc7b204009a81e8b9c3c5de89afa1d4)
- Tipo QA, P0. Deps: matriz E2E.
- Acceptance: E2E or integration cases for proveedor caído, duplicados, and races, with typed expected errors.

### Context

This is the strongest existing slice. Failures are `TaggedError` with stable `code` (ADR-0011). EA types stay in adapters.

**Provider down.** `classify-provider-failure.test.ts` asserts `isRetryableProviderError(ProviderTimeout)` is `true` and `ProviderSchemaError` is `false`. `providerHealthOutcome(ProviderUnavailable)` is `"circuit_open"`. `providerRetryDelayMs` with `retryAfterSeconds: 60` is `60000`. `ExecuteProviderSyncJobUseCase` schedules retry then `dead` at `maxAttempts: 2` for HTTP 503. HTTP `failureToHttp` maps `game_data.provider_unavailable` to status `503`. Player recent-match detail maps open circuit to `503`. Candidates map thrown persistence failures to `results.candidate_data_unavailable` without leaking `"private provider failure details"`.

**Duplicates.** Migration `0019` has `UNIQUE (provider_key, external_match_id)` on `provider_matches` and `UNIQUE (provider_key, resource_type, external_resource_id, payload_hash)` on raw observations. `InMemoryRawObservationRepository` keeps the first observation for an idempotency key. `InMemoryProviderMatchRepository.upsertMany` upserts by provider identity. `SelectOfficialMatchesUseCase` fails with `DuplicateProviderMatch` when the same `externalId` fills two slots. Enqueue of the same sync body returns the same job `id`. HTTP `POST /internal/game-data/sync-jobs` then two `POST .../run` keeps provider calls at `1`.

**Race and replay.** `CreateScheduleChangeRequestUseCase` returns the same request on identical idempotency replay and emits one `scheduling.reschedule-requested`. A different payload with the same key yields `scheduling.schedule_change_idempotency_conflict`. Postgres `provider-reliability.integration.test.ts` claims one of two concurrent `claimNext` calls. `ProjectOfficialResultUseCase` keeps one contribution when projecting the same revision twice.

`TEST_DATABASE_URL` suites use `describe.skipIf(!databaseUrl)`. CI does not set that variable, so UNIQUE `23505` and claim races do not run on GitHub Actions.

### Paths and symbols

- `isRetryableProviderError`, `providerHealthOutcome`, `providerRetryDelayMs`
- `ExecuteProviderSyncJobUseCase.execute`
- `EnqueueProviderSyncJobUseCase.execute` (dedupe key)
- `DuplicateProviderMatch` / `results` selection errors
- `ScheduleChangeRequestIdempotencyConflict` code `scheduling.schedule_change_idempotency_conflict`
- `handleGameDataSyncJob` in `apps/web/src/workers/game-data-sync.worker.ts`
- `PostgresProviderSyncJobRepository.claimNext`

### Gaps

- No Postgres test in CI that inserting two `provider_matches` rows with the same `(provider_key, external_match_id)` fails with `23505`.
- `AC-SEL-003` (reuse of an approved provider match on another OfficialMatch) is not tested. `DuplicateProviderMatch` only covers two slots in one propose call.
- `ConfirmOfficialSelectionUseCase` computes `revision = (existing?.revision ?? 0) + 1` and the test expects a second confirm to produce revision `2` and a second `results.official-result-approved`. That contradicts `AC-SEC-002` replay-without-duplicate-effects. The use case also requires selection status `awaiting_opponent_confirmation`, so a true HTTP retry after approval should hit `SelectionNotConfirmable`. There is no test that a second confirm after status `approved` is a no-op with one result and one event.
- No HTTP test that `GET /encounters/:id/candidates` returns `503` and `results.candidate_data_unavailable` when the provider is down. OpenAPI already advertises `503` for that operation.
- No two-captain concurrent confirm race at application or HTTP layer.
- Outbox replay is not an HTTP E2E. Fixture generation fails closed if publish throws (`generate-competition-fixture.use-case.test.ts`). Reschedule request rolls back if publish fails. There is no queue consumer test that redelivery of `results.official-result-approved` does not double standings.
- Sync never auto-officializes is implied by missing selection HTTP, not asserted in one test that standings stay empty after sync.

### Behavior tests

1. **Provider 503 on candidates.** With clubs linked and the provider returning HTTP 503, `GET /encounters/{id}/candidates` status is `503` and `code` is `results.candidate_data_unavailable`. Body has no EA payload and no `"private provider failure details"`.
2. **Job dead after max attempts.** `ExecuteProviderSyncJobUseCase.execute` twice against 503 with `maxAttempts: 2` yields statuses `retry_scheduled` then `dead`. Ingest call count is `2`. No `OfficialResult`.
3. **UNIQUE match identity.** Second `INSERT` into `provider_matches` with `provider_key = 'ea-clubs'` and `external_match_id = 'm-1'` raises SQLSTATE `23505`. Enable this in CI with `TEST_DATABASE_URL`.
4. **Approved id cannot be reused.** After encounter A approves `ea-clubs:m-1`, proposing that ref on encounter B returns tagged error for `AC-SEL-003` (code to pin once the use case exists). OfficialResult count for B stays `0`.
5. **Confirm replay is a no-op.** After a successful confirm, a second `execute` with the same actor and encounter returns the same `OfficialResult.id` and `revision: 1`. Event list length stays `1`. Standings rows stay length `1`.
6. **Concurrent confirm.** Two `execute` calls at once on the same awaiting selection. One approved result. One `results.official-result-approved`. The loser is `results.selection_not_confirmable` or an equivalent tagged conflict.
7. **Sync replay.** HTTP `POST .../sync-jobs` twice then `POST .../run` twice. Job `id` is equal. Provider HTTP count is `1`. `provider_matches` count for that external id is `1`.
8. **Outbox redelivery.** Re-publish `results.official-result-approved` for the same `officialResultId`. Contribution list length stays `1`. Matches the existing application assertion, then repeat through the real consumer once it exists.

### Notas

Keep these as integration and HTTP tests even after the E2E matrix exists. Do not only bury them inside the happy-path E2E. Typed `code` values are the contract for UI and i18n. Fix confirm idempotence in results before writing an E2E that expects one officialization. The current confirm test documents a revision bump, not a replay no-op.

---

## 3. Contract tests OpenAPI críticos

- Notion: [Contract tests OpenAPI críticos](https://app.notion.com/p/3dc7b204009a81838e16ff21be1d883f)
- Tipo QA, P1. Deps: [API selección / confirmación / disputa](https://app.notion.com/p/3dc7b204009a812d8f2ec66662d3a161) (Not started); [API Crear/listar solicitudes de reprogramación](https://app.notion.com/p/3dc7b204009a818c95a0e756f935c4f8) (Not started).
- Acceptance: contract tests for critical encounters, results, and scheduling endpoints. CI breaks on drift.

### Context

`packages/api-contracts/src/v1/openapi/document.ts` is the OpenAPI 3.1 document. `scripts/generate-openapi.ts` writes committed `openapi.json` and `openapi.yaml`. `apps/api` serves them at `/api/v1/openapi.json`. `apps/web` has matching TanStack routes. `GET /api/v1/meta/ping` is asserted as `{ ok: true, service: "futrob", apiVersion: "v1" }`.

What exists today is **schema and document pinning**, not a live contract suite (no Spectral, Dredd, or Schemathesis).

Pinned OpenAPI tests:

- `encounter-candidates.test.ts` expects `operationId` `listEncounterCandidates`, `200` schema `ListEncounterCandidatesResponse`, and `503` `$ref` `ApiError`.
- `provider-sync-jobs.test.ts` expects `/game-data/sync-jobs` absent and `/internal/game-data/sync-jobs` present.

HTTP tests parse responses with the same Zod schemas (`listEncounterCandidatesResponseSchema`, `fixturePlanSchema`, `providerSyncJobResponseSchema`). SDK `results.test.ts` mocks fetch and asserts `listEncounterCandidates("encounter-1")` equals the ready payload with empty `candidates`. That would still pass if the real Hono handler disappeared. It is a client parser test, not a contract against the server.

Critical competitive paths **missing from OpenAPI** (grep of `packages/api-contracts` finds none):

- select official matches
- confirm official selection
- dispute
- create or list schedule-change requests

Present but weakly tested at HTTP:

- `GET /organizations/{organizationId}/competitions/{competitionId}/standings`
- `GET .../rankings`
- `PUT /encounters/{encounterId}/schedule-snapshot` (organizer snapshot, not captain reschedule)

CI does not run `generate:openapi` or fail if yaml drifts from `document.ts`. ADR-0005 called for that check.

### Paths and symbols

- `futrobOpenApiV1` in `packages/api-contracts/src/v1/openapi/document.ts`
- `listEncounterCandidatesResponseSchema` in `packages/api-contracts/src/v1/encounters/schemas.ts`
- `registerEncounterRoutes` in `apps/api/src/http/routes/encounters.ts`
- `createFutrobClient().results.listEncounterCandidates`
- `npm run generate:openapi`

### Gaps

- No CI step `npm run generate:openapi && git diff --exit-code packages/api-contracts/openapi`.
- No test that a live `app.request` body matches the generated OpenAPI response schema for standings, rankings, snapshot, or (once built) select, confirm, and schedule-change.
- No test that tagged error `code` values in OpenAPI `ApiError` examples include `results.encounter_not_found`, `results.selection_not_confirmable`, `scheduling.schedule_change_idempotency_conflict`, `scheduling.fixture_managed_conflict`.
- Snapshot 409 `fixture_managed_conflict` is documented in the CLI skill. Pin it as an HTTP contract when the matrix runs `snapshot-set` on a fixture-owned encounter.
- Do not start contract tests for select, confirm, or reschedule-request until those routes exist. The QA card depends on those API cards on purpose.

### Behavior tests

1. **OpenAPI drift.** `npm run generate:openapi` leaves `openapi.yaml` and `openapi.json` unchanged. CI fails if they differ. Literal expect: `git diff --exit-code` exit `0` on a clean tree.
2. **Candidates 200 ready.** Live `GET /api/v1/encounters/{id}/candidates` status `200`, `status` field `"ready"`, and parsed body equals `listEncounterCandidatesResponseSchema.parse(body)`. `candidates[0]` has no `players` key (`schemas.test.ts` already pins this on the schema alone; repeat against HTTP).
3. **Candidates 404 foreign org.** Status `404`, `code` `"results.encounter_not_found"`. Already true in `encounters.test.ts`. Keep it as a named contract case.
4. **Candidates 503 provider down.** Status `503`, `code` `"results.candidate_data_unavailable"`.
5. **Fixture replay.** Second `POST .../fixture` with the same generation input returns the same plan `id` and HTTP 200 family used today. Pin the status code the handler actually returns.
6. **Snapshot on fixture-owned encounter.** `PUT .../schedule-snapshot` status `409`, `code` `"scheduling.fixture_managed_conflict"`.
7. **Standings after zero official results.** `GET .../standings` status `200`, `rows` equal `[]` (or only zeroed teams, pin whichever the use case returns).
8. **Select / confirm / schedule-change (after API cards).** For each new path, one test of 200 or 202 with a parsed schema, and one test of 403 or 404 with a stable `code`. Fail CI if `futrobOpenApiV1.paths[path]` is undefined.

### Notas

Put the drift check in `ci.yml` `check` or `test`, not nightly. Contract tests are cheap. Do not use mocked SDK tests as the only proof. Call `createApp().request` or `e2e-golden-path` plus follow-up GETs.

---

## 4. Subset móvil del happy path competitivo

- Notion: [Subset móvil del happy path competitivo](https://app.notion.com/p/3dc7b204009a8133abd5de14a0a8ed5a)
- Tipo QA, P2. Deps: [Pantallas Match Center del enfrentamiento](https://app.notion.com/p/3dc7b204009a8162b0eae6434b132fff); [Smoke E2E móvil](https://app.notion.com/p/3dc7b204009a8158b265e350d224755c) (signup → onboarding → home → inbox).
- Acceptance: subset when Match Center and reschedule UI exist. Documented skip if they do not.

### Context

`apps/mobile` is Expo SDK 57, Expo Router. README states the current app is foundational: auth, SecureStore, SDK client, tokens, empty home. Target MVP includes Match Center. It is not implemented.

Tests: `apps/mobile/src/modules/identity/auth-validation.test.ts` asserts `validateEmail("capitan@club.mx")` is `null` and `validateEmail("sin-arroba")` is `AUTH_VALIDATION_EMAIL`. Root `vite.config.ts` `test.projects` does not include `apps/mobile`, so `npm test` in CI never runs that file.

`verify-futrob` SKILL.md **Out of scope**: native iOS and Android (`AC-MOB-*`). Expo web is not that proof. Feature README repeats the skip.

There is no Detox, Maestro, or Playwright mobile project.

Smoke E2E móvil is a different card (Fundamentos, P1) and is also Not started. This P2 subset should not start before that smoke and Match Center UI exist.

### Paths and symbols

- `apps/mobile/README.md` (foundation vs MVP contract)
- `getFutrobClient` in `apps/mobile/src/modules/api/futrob-client.ts`
- `apps/mobile/app/(home)/index.tsx`
- `AC-MOB-002` captain bullets: fixtures, Encounter, reprogramar, selección y confirmación
- `AC-E2E-001` sentence that authenticated operation must work from `apps/web` and `apps/mobile`

### Gaps

- No Match Center screens in mobile or web.
- SDK `results` resource has only `listEncounterCandidates`. No select, confirm, or schedule-change client.
- No native CI job.

### Behavior tests

**While Match Center UI is absent, the documented skip is the deliverable.** Record it in this file and in `verify-futrob/features/README.md` (already listed). Do not mark `AC-MOB-002` captain flows verified via Expo web.

When UI exists, native-only cases:

1. **Captain opens encounter.** After smoke signup and a seeded encounter, the native app shows home and away names and `officialMatchCount` `2`. Accessible name includes both team names.
2. **Candidates are not official.** Candidate list shows five rows. No row has an approved-official badge.
3. **Propose and confirm.** Same business outcome as web: one `OfficialResult`, standings updated. `EffectiveAccess` hides confirm for a player without `encounters.official-selection.resolve`.
4. **Reschedule slot 2.** After accept, only slot 2 time changes.

Until then, one CI-safe check: `apps/mobile` has no import of `@futrob/results` or `@futrob/game-data` (`AC-MOB-003`). That can be an oxlint or unit test of import graphs. It is not a competitive subset.

### Notas

Recommend **skip with pointer**. Close the QA card only when the skip is in the verification map and this research note. Reopen when Match Center UI and smoke móvil land. Do not invent Detox in this epic before those deps.

---

## 5. Job CI nightly E2E

- Notion: [Job CI nightly E2E](https://app.notion.com/p/3dc7b204009a8190af37d25726e4c8cd)
- Tipo Feature, P1. Deps: matriz E2E.
- Acceptance: nightly job runs E2E Must and reports failures. Does not block PRs unless agreed.

### Context

`.github/workflows/ci.yml` triggers on `push` to `main` and `pull_request`. No `schedule`. Jobs are check, typecheck, test (coverage + Playwright for Storybook), and build.

`.github/workflows/health-check.yml` has a commented cron `*/15 * * * *` and a TODO to re-enable once production is live. It curls `PROD_API_HEALTH_URL` and `PROD_WEB_URL`. That is a production ping, not the competitive matrix.

`pullfrog.yml` and `audit.yml` are `workflow_dispatch` only.

`e2e-golden-path` needs a running API, `INTERNAL_JOB_SECRET`, and `--actor`. Without `DATABASE_URL` the API uses in-memory stores. A nightly that restarts the API between steps would lose orgs. The job needs Postgres (migrated) or a single long-lived API process.

### Paths and symbols

- `.github/workflows/ci.yml` (do not add the matrix here)
- `.github/workflows/health-check.yml` (do not overload this ping)
- `apps/cli/src/commands/e2e-golden-path.ts` plus the follow-up commands the matrix adds
- `apps/api/migrations/*.sql`

### Gaps

- No `on.schedule` workflow for E2E.
- No `workflow_dispatch` E2E job either, so the matrix cannot be run manually in CI today.
- Playwright in CI is not the competitive matrix.
- Secrets for a nightly against a durable API (Postgres `DATABASE_URL`, `INTERNAL_JOB_SECRET`) are not defined for this job.

### Behavior tests

The workflow itself is the artifact. Prove it with:

1. **Does not run on pull_request.** A workflow file with `on.schedule` and `workflow_dispatch` only. `pull_request` is absent. Opening a PR does not start this job.
2. **Cron present.** `cron` is a daily UTC time the team picks. Comment in the workflow states it does not gate merges.
3. **Runs the Must script.** The job invokes the same command the matrix documents (likely `npm run cli -- e2e-golden-path` plus later steps). Exit `0` on a seeded API. Failure uploads logs.
4. **Reports failure.** A failed step marks the nightly red. It does not set `ci.yml` required checks.
5. **Idempotent against a reused database.** Running the job twice with `--keep-names` false (timestamp suffix already in `e2e-golden-path`) still exit `0`. Org names stay unique because of the `Date.now()` suffix.

### Notas

Add the workflow only after the matrix command exists and is green locally. Until then, a `workflow_dispatch` dry run that runs current `e2e-golden-path` against a service container is optional scaffolding. Do not attach it as a required status. Keep `health-check.yml` as a production ping.

---

## Cross-cutting gotchas

- **Hexagonal split.** E2E may use CLI and HTTP. Domain tests stay on fake ports. Do not import EA adapters from results or statistics tests.
- **Sync never officializes.** Any matrix step that syncs must assert standings unchanged until confirm.
- **Confirm revision bump.** `ConfirmOfficialSelectionUseCase` currently increments revision on a second pass. E2E that asserts `AC-SEC-002` will fail until that use case is a no-op after approval.
- **HTTP holes.** Selection, confirmation, dispute, and captain reschedule requests are Not started API cards. Contract tests and E2E for those steps wait on them.
- **Postgres skip.** UNIQUE and claim-race tests are real but invisible in GitHub Actions without `TEST_DATABASE_URL`.
- **Mobile skip is already written** in `verify-futrob`. The P2 card is satisfied by keeping that skip until deps land, not by pretending Expo web is native.
- **Vocabulary.** Tests say Encounter, OfficialMatch, ProviderMatch, OfficialResult. Not `EaMatch`.

## Recommended sequence

1. Confirm replay no-op and `AC-SEL-003` uniqueness (unblocks honest E2E).
2. OpenAPI drift check in `ci.yml` (cheap, independent).
3. API cards for select, confirm, and schedule-change, then HTTP contract tests.
4. Extend `e2e-golden-path` into the Must matrix.
5. Nightly workflow that calls that command.
6. Provider-down and race cases as extra jobs or tags on the same API, not only inside the happy path.
7. Mobile subset after Match Center UI and smoke móvil.

## Sources

- Notion pages listed in each task (fetched 2026-09-15, blank bodies; properties only).
- `product/acceptance-criteria.md`, `product/mvp-requirements.md` `NFR-02`.
- `.github/workflows/*.yml`, `vite.config.ts`, `apps/web/vite.config.ts`.
- Tests and routes cited in Paths and symbols.
- `.cursor/skills/verify-futrob/features/README.md` and `competition-setup.md`.
- ADR-0005, ADR-0007, ADR-0011.
