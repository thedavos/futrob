# Futrob

Multi-tenant platform for EA SPORTS FC leagues and cups. MVP focus: **FC Clubs**, with provider-normalized match data, auditable official selection, rescheduling, standings, rankings, and a public portal.

## Status

Two product deployables are wired and running locally:

| App                    | Role                                                                  |
| ---------------------- | --------------------------------------------------------------------- |
| [`apps/web`](apps/web) | TanStack Start on Cloudflare Workers — UI, Better Auth (D1), BFF      |
| [`apps/api`](apps/api) | Hono on Node (Railway) — product `/api/v1`, Postgres, EA Clubs egress |

What works today:

- Email/password auth (Better Auth on D1) with Tunnel Split `/login` and `/signup`
- Post-auth gate → `/onboarding`, `/orgs`, or `/orgs/:id` by membership count
- Organizations, memberships, and invitations on **Postgres** via `apps/api` (web BFF resolves `ActorId` and calls the API with `INTERNAL_JOB_SECRET`)
- Game-data club search against EA Clubs through `apps/api`
- Hexagonal BCs in `packages/@futrob/*` (domain/application); adapters only in apps

Still ahead for MVP: full competition/scheduling/results flows, standings, rankings, and the public portal.

## Deployable split

```text
Browser ──cookie──► apps/web (Workers)
                      │ Better Auth + Actors (D1)
                      │ BFF (service auth + ActorId)
                      ▼
                    apps/api (Railway)
                      ├── Postgres (organizations, …)
                      └── EA Clubs (Node egress)
```

- **Auth only** on Workers/D1 (sessions, actors).
- **Organizations / memberships / invitations** on `apps/api` + Postgres.
- UI never talks org persistence to D1.

## Critical separation

```text
scheduling   → when / how many official slots
game-data    → what external providers reported (EA Clubs adapter)
results      → which matches count officially
statistics   → standings / rankings from approved results
analytics    → premium interpretation
```

## Stack

| Layer         | Choice                                                   |
| ------------- | -------------------------------------------------------- |
| Web           | TanStack Start + React (`apps/web`) → Cloudflare Workers |
| API           | Hono + Node (`apps/api`) → Railway                       |
| Architecture  | Hexagonal BCs in `packages/<bc>`; DI in each app         |
| Auth          | Better Auth (D1) + Futrob organizations (Postgres)       |
| Data (web)    | D1 (auth/actors), R2, Queues, Cron                       |
| Data (api)    | Postgres (`DATABASE_URL`)                                |
| UI            | Sistema light-first Futrob, shadcn / Base UI + Storybook |
| Tooling       | Vite+ (oxfmt, oxlint, Vitest)                            |
| Observability | Sentry at boundaries                                     |

## Layout

```text
apps/
├── web/                 # Must deployable (Workers) — UI, auth, BFF
│   ├── migrations/      # D1 (Better Auth + actors)
│   └── src/{di,modules,routes,shared,workers}/
├── api/                 # Product API (Railway) — Postgres + EA egress
│   ├── migrations/      # Postgres (organizations, …)
│   └── src/{adapters,di,http}/
└── cli/                 # Domain playground — see apps/cli/README.md

packages/
├── <bc>/                # @futrob/<bc> — domain + application (no adapters)
├── api-contracts/       # Zod / OpenAPI for /api/v1
├── sdk/                 # Typed HTTP client
├── ui/                  # Tokens + shadcn primitives
├── shared-kernel/       # Result, IDs, domain errors
└── test-support/
```

Package guide: [`/packages/README.md`](/packages/README.md). API details: [`/apps/api/README.md`](/apps/api/README.md).

## Local setup

```bash
vp install                 # or npm ci

# Web secrets (Wrangler / Vite Cloudflare plugin)
# apps/web/.dev.vars — BETTER_AUTH_*, INTERNAL_JOB_SECRET, …

# API env
cp apps/api/.env.example apps/api/.env
# set DATABASE_URL + INTERNAL_JOB_SECRET (must match web)

# D1 local (auth)
cd apps/web && npx wrangler d1 migrations apply futrob-app --local && cd ../..

# Postgres (organizations) — apply apps/api/migrations/*.sql to DATABASE_URL

npm run dev                # web (:3000) + api (:8787) in parallel
```

Align `INTERNAL_JOB_SECRET` between `apps/web/.dev.vars` and `apps/api/.env` or org BFF calls fail with 401.

## Docs

- [PRD](/product/prd.md)
- [Design system](/product/design-system-spec.md)
- [UI primitives](/packages/ui/README.md)
- [Architecture overview](/docs/architecture/overview.md)
- [Module boundaries](/docs/architecture/module-boundaries.md)
- [Packages and SDK](/docs/architecture/packages-and-sdk.md)
- [AGENTS.md](/AGENTS.md)
- Skill: [`.cursor/skills/futrob-hexagonal-module/SKILL.md`](/.cursor/skills/futrob-hexagonal-module/SKILL.md)

## Commands

```bash
vp install                 # or npm ci
npm run check              # vp check
npm run test               # vp test
npm run typecheck
npm run dev                # web + api in parallel
npm run web                # apps/web only
npm run api                # apps/api only
npm run build              # vp build apps/web
npm run ui:storybook       # catálogo UI en :6006
npm run ui:storybook:build # build estático de Storybook
npm run format             # vp fmt
npm run lint               # vp lint
npm run cli -- help
npm run cli -- domain-smoke
```

Vite+ lives at the repo root (`vite.config.ts`) and in `apps/web` — oxfmt, oxlint, and Vitest (`import … from "vite-plus/test"`). `apps/cli` stays on `tsx` and is only covered by root fmt/lint.
