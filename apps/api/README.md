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

Game data (public CORS for the browser SDK today):

- `GET /game-data/clubs/search?query=…` — search external clubs.
- `GET /game-data/clubs/:externalClubId` — external club info.
- `GET /game-data/clubs/:externalClubId/matches` — recent provider matches.

Organizations (service auth from `apps/web` BFF — not browser cookies):

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

| Table                      | Owner           | Purpose                                                                                                                 |
| -------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `organizations`            | `organizations` | Tenant. `normalized_name` enforces the globally unique organization name; `creation_key` repairs onboarding retries.    |
| `organization_invitations` | `organizations` | Hashed, expiring invitation token. `competition_id` identifies the competition that issued a player/captain invitation. |
| `competition_memberships`  | `competitions`  | Contextual actor access to one competition. It does not create a team entry or roster membership.                       |

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

| Variable              | Required       | Default                                       | Purpose                                                 |
| --------------------- | -------------- | --------------------------------------------- | ------------------------------------------------------- |
| `PORT`                | no             | `8787`                                        | HTTP listen port                                        |
| `NODE_ENV`            | no             | `development`                                 | Runtime mode                                            |
| `DATABASE_URL`        | no (prod: yes) | unset                                         | Postgres connection string (Railway / Neon)             |
| `INTERNAL_JOB_SECRET` | yes (orgs)     | unset                                         | Shared with `apps/web` for trusted ActorId org calls    |
| `EA_CLUBS_BASE_URL`   | no             | `https://proclubs.ea.com/api/fc`              | EA Clubs egress base                                    |
| `CORS_ORIGINS`        | no             | `http://localhost:3000,http://127.0.0.1:3000` | Comma-separated browser origins allowed to call the API |

Local file:

```bash
cp apps/api/.env.example apps/api/.env
# edit DATABASE_URL / PORT as needed
npm run api
```

`src/main.ts` loads `apps/api/.env` via `src/utils/load-dotenv.ts` (does not override vars already set in the shell). `.env` is gitignored; commit only `.env.example`.

## Railway notes

- Apply migrations `0001` through `0009` in filename order
  to Postgres before relying on organization, onboarding, or player-profile persistence.
- Set `DATABASE_URL`, `INTERNAL_JOB_SECRET`, and `EA_CLUBS_BASE_URL` as service variables.
- Start command: `npm run start -w @futrob/api`. Railway injects `PORT`; the app reads it.
- Health check path: `/api/v1/meta/health`.
- EA egress relies on browser-like headers (`EA_CLUBS_REQUEST_HEADERS`) so Node
  requests are not blocked by EA's edge.

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
