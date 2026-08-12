# @futrob/api

Product HTTP API for Futrob. Hono on Node, deployed to Railway. It serves the
current `/api/v1` OpenAPI contract on top of the same `@futrob/<bc>` use cases
that `apps/web` uses, and owns Node egress to EA Clubs plus Postgres.

```text
Browser/UI → apps/web → HTTP → apps/api (Hono/Node on Railway) → Postgres
                                    ↘ EA Clubs via Node fetch (adapters here)
```

Business logic stays in `@futrob/<bc>` packages (`game-data`, `organizations`,
…). This app only holds adapters, DI, and HTTP wiring.

## Endpoints (`/api/v1`)

Meta / contract:

- `GET /meta/ping` — service ping (`pingResponseSchema`).
- `GET /meta/health` — `SELECT 1` against Postgres when `DATABASE_URL` is set,
  otherwise `db: "skipped"`.
- `GET /openapi.json` and `GET /openapi.yaml` — the `@futrob/api-contracts` document.

Game data (service auth from `apps/web` BFF — not browser cookies):

- `GET /game-data/clubs/search?query=…` — search external clubs.
- `GET /game-data/clubs/:externalClubId` — external club info.
- `GET /game-data/clubs/:externalClubId/matches` — recent provider matches.

Provider operations (service-authenticated):

- `POST /internal/game-data/sync-jobs` — enqueue tenant-scoped work with active-job deduplication.
- `POST /internal/game-data/sync-jobs/:jobId/run` — lease and execute one recoverable attempt.
- `GET /internal/game-data/providers/:providerKey/health` — sanitized snapshot for platform
  administrators. Raw payloads, upstream bodies, queries and external club IDs are never returned.

The web BFF exposes `POST /api/v1/game-data/sync-jobs` on the `apps/web` host; it is intentionally not
part of this Railway API's OpenAPI document. It uses the Better Auth session and requires effective
`organizations.read` access for the submitted tenant before it persists through the internal API and
publishes only `jobId` and `requestId` to `JOB_QUEUE`. Queue deliveries use the
durable `availableAt` value for delayed retries, stop after the configured attempts, and fall through
to `futrob-job-dlq`. A one-minute Cron calls the service-only `run-next` recovery endpoint so a job
survives an interrupted publication or Queue delivery. Replaying a message is safe because claim and
completion are lease-token guarded.

The API caches successful club searches for 30 seconds and club details for five minutes. A
five-minute stale window is used only after transient provider failures. Recent matches are not
served stale; immutable observations and normalized matches remain the durable source. Retries are
limited to timeout, network, 408, 429 and 5xx responses. The shared circuit opens after three final
transient failures, waits 60 seconds, then grants one ten-second half-open probe.

Provider health is a rolling 24-hour window capped at 1,000 samples. The response includes
`windowStartedAt` and `sampleSize`. Events older than 30 days are pruned when an administrator reads
health; the `occurred_at` retention index keeps that operation bounded. Telemetry writes are
best-effort and never delay a provider response.

Organizations (same service auth):

- `GET /organizations/mine`
- `GET /organizations/post-auth-destination`
- `POST /organizations/name-availability`
- `POST /organizations`
- `POST /organizations/:organizationId/invitations` — organization-level staff invitations only.
- `POST /organizations/invitations/accept`

Competitions (service auth, organization-scoped):

- `GET /organizations/:organizationId/competitions/:competitionId` — reads the competition and
  current rules for authorized organizer/staff members.
- `POST /organizations/:organizationId/competitions/:competitionId/invitations` — creates a
  competition-scoped invitation. The organization membership remains the tenant boundary; the
  accepted actor also receives a contextual competition membership.
- `POST /competitions/invitations/accept` — accepts a competition-scoped invitation after
  onboarding and returns the competition destination directly.

Identity product state (same service auth):

- `GET /identity/onboarding`
- `PATCH /identity/onboarding` — records only the current path and step.
- `POST /identity/onboarding/{organization|invitation|player}` — orchestrates the selected path.
  Organization onboarding creates an idempotent organization and competition draft; every path
  ensures a personal player profile and may add an optional declared EA account.

Requires `Authorization: Bearer <INTERNAL_JOB_SECRET>` and `X-Futrob-Actor-Id`.
Without `DATABASE_URL`, organizations, competitions, player profiles and actor onboarding use in-memory stores
(process-local).

### Persistence added by onboarding

| Table                            | Owner           | Purpose                                                                                                                 |
| -------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `organizations`                  | `organizations` | Tenant. `normalized_name` enforces the globally unique organization name; `creation_key` repairs onboarding retries.    |
| `organization_invitations`       | `organizations` | Hashed, expiring invitation token. `competition_id` identifies the competition that issued a player/captain invitation. |
| `competition_memberships`        | `competitions`  | Contextual actor access to one competition. It does not create a team entry or roster membership.                       |
| `teams`                          | `teams`         | Organization-scoped competitive unit. `creation_key` repairs create retries.                                            |
| `competition_entries`            | `competitions`  | Team inscription in a competition (`UNIQUE(competition_id, team_id)`).                                                  |
| `competition_roster_memberships` | `teams`         | PlayerProfile on a team in a competition (`UNIQUE(player_profile_id, competition_id)`). Optional `game_account_id`.     |
| `active_team_preferences`        | `teams`         | One active roster membership per actor for personal UI context.                                                         |
| `provider_sync_jobs`             | `game-data`     | Tenant-scoped job ledger, dedupe key, attempts and recoverable leases.                                                  |
| `provider_response_cache`        | `game-data`     | Shared successful response cache and cross-replica refresh lease.                                                       |
| `provider_circuit_state`         | `game-data`     | Shared closed/open/half-open state.                                                                                     |
| `provider_health_events`         | `game-data`     | Sanitized append-only outcomes, latency and correlation identifiers.                                                    |

The onboarding invitation endpoint accepts only invitations with `competition_id`. A successful
acceptance ensures both the organization membership required for tenant isolation and the
competition membership used for contextual access.

Query params for game-data (`providerKey`, `platform`, `gameEdition`, `matchType`,
`maxResultCount`) are validated at the edge with `@futrob/api-contracts` and
default to EA Clubs.

## Run

```bash
npm run api            # api only (tsx watch), from repo root
npm run api:start      # run once (tsx)
npm run dev            # web + api together
npm run api:typecheck
npm run api:test       # vitest smoke via Vite+ (mocks EA fetch)
```

Default port is `8787`. The app boots without a database. Without
`DATABASE_URL`, `/meta/health` reports `db: "skipped"` rather than crashing.

## Environment

| Variable                     | Required       | Default                                       | Purpose                                                            |
| ---------------------------- | -------------- | --------------------------------------------- | ------------------------------------------------------------------ |
| `PORT`                       | no             | `8787`                                        | HTTP listen port                                                   |
| `NODE_ENV`                   | no             | `development`                                 | Runtime mode                                                       |
| `DATABASE_URL`               | no (prod: yes) | unset                                         | Postgres connection string (Railway / Neon)                        |
| `INTERNAL_JOB_SECRET`        | yes            | unset                                         | Shared with `apps/web` for trusted BFF calls (game-data, orgs, …)  |
| `INITIAL_SUPERUSER_ACTOR_ID` | no             | unset                                         | Seeds and audits the first persisted superuser; ignored afterwards |
| `EA_CLUBS_BASE_URL`          | no             | `https://proclubs.ea.com/api/fc`              | EA Clubs egress base                                               |
| `CORS_ORIGINS`               | no             | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated browser origins allowed to call the API            |

Local file:

```bash
cp apps/api/.env.example apps/api/.env
# edit DATABASE_URL / PORT as needed
npm run api
```

`src/main.ts` loads `apps/api/.env` via `src/utils/load-dotenv.ts` (does not override vars already set in the shell). `.env` is gitignored; commit only `.env.example`.

## Railway notes

- Apply all migrations in filename order through `0028_provider_health.sql`.
- Set `TEST_DATABASE_URL` to run the clean/legacy migration integration suite; it creates and
  removes a uniquely named schema without touching existing schemas.
  to Postgres before relying on organization, onboarding, or player-profile persistence.
- Set `DATABASE_URL`, `INTERNAL_JOB_SECRET`, and `EA_CLUBS_BASE_URL` as service variables.
- Start command: `npm run start -w @futrob/api`. Railway injects `PORT`; the app reads it.
- Health check path: `/api/v1/meta/health`.
- EA egress relies on browser-like headers (`EA_CLUBS_REQUEST_HEADERS`) so Node
  requests are not blocked by EA's edge.
- A growing `retry_scheduled` queue indicates transient degradation. `dead` jobs require operator
  review after the upstream or schema issue is understood; replaying the same successful job is safe.

## Layout

Imports use the `@/` alias → `src/*` (no `../` parent paths). Configure in
`tsconfig.json` + `vite.config.ts`.

- `src/config/env.ts` — env parsing with safe defaults.
- `src/utils/` — generic helpers (dotenv load, HTTP response builders).
- `src/adapters/game-data/` — EA Clubs, manual, and registry adapters (Node egress).
- `src/adapters/identity/` — Postgres and in-memory actor-onboarding adapters.
- `src/adapters/competitions/` — organization-scoped Postgres and in-memory competition drafts.
- `src/adapters/teams/` — personal player profiles and declared game accounts.
- `src/adapters/persistence/` — Postgres health probe and an in-memory provider-match stub.
- `src/di/` — composition root (`createModules`, `createGameDataModule`).
- `src/http/` — error mapping, DTO mappers, and route registration.
- `src/app.ts` / `src/main.ts` — Hono app factory and the Node server entry.
