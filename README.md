# Futrob

Multi-tenant platform for EA SPORTS FC leagues and cups. MVP focus: **FC Clubs**, with provider-normalized match data, auditable official selection, rescheduling, standings, rankings, and a public portal.

## Status

Four product deployables are part of the MVP and wired locally:

| App                          | Role                                                                  |
| ---------------------------- | --------------------------------------------------------------------- |
| [`apps/web`](apps/web)       | TanStack Start on Workers — UI, auth proxy, BFF                       |
| [`apps/auth`](apps/auth)     | Better Auth Worker — credentials, sessions, actors, D1 migrations     |
| [`apps/api`](apps/api)       | Hono on Node (Railway) — product `/api/v1`, Postgres, EA Clubs egress |
| [`apps/mobile`](apps/mobile) | React Native + Expo — native authenticated client via `@futrob/sdk`   |

What works today:

- Email/password auth (Better Auth on D1) with Tunnel Split `/login` and `/signup`
- Post-auth gate → `/onboarding`, `/orgs`, or `/orgs/:id` by membership count
- Organizations, memberships, and invitations on **Postgres** via `apps/api` (web BFF resolves `ActorId` and calls the API with `INTERNAL_JOB_SECRET`)
- Game-data club search against EA Clubs through `apps/api`
- Hexagonal BCs in `packages/@futrob/*` (domain/application); adapters only in apps

Still ahead for MVP: full competition/scheduling/results flows, standings, rankings, the public portal, and authenticated feature parity in the native mobile app.

## Deployable split

```text
Browser ──cookie──► apps/web ──AUTH_SERVICE──► apps/auth ──► D1
Mobile  ──Bearer──► apps/auth ──────────────────► D1
Mobile  ──Bearer──► apps/web /api/v1 BFF
                       │
                       └── service auth + ActorId ──► apps/api
                                                       ├── Postgres
                                                       └── EA Clubs
```

- `apps/auth` writes credentials, sessions, actors, and auth rate limits in D1.
- `apps/web` asks `AUTH_SERVICE` for `get-session` and only looks up `identity_subjects` (and BFF rate limits) in D1.
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
| Mobile        | React Native + Expo MVP, vía `@futrob/sdk`               |
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
├── web/                 # Must deployable (Workers) — UI, BFF, AUTH_SERVICE proxy
│   ├── migrations/      # D1 (BFF rate limit)
│   └── src/{di,modules,routes,shared,workers}/
├── api/                 # Product API (Railway) — Postgres + EA egress
│   ├── migrations/      # Postgres (organizations, …)
│   └── src/{adapters,di,http}/
├── auth/                # Better Auth Worker — D1 schema owner (user/session/actors)
├── mobile/              # React Native + Expo (Expo Router) — see apps/mobile/README.md
└── cli/                 # Domain playground — see apps/cli/README.md

packages/
├── <bc>/                # @futrob/<bc> — domain + application (no adapters)
├── api-contracts/       # Zod / OpenAPI for /api/v1
├── sdk/                 # Typed HTTP client (web + React Native / Expo)
├── ui-tokens/           # Shared design tokens (web CSS + mobile) — generated tokens.css
├── ui/                  # Tokens + shadcn primitives
├── shared-kernel/       # Result, IDs, domain errors
└── test-support/
```

Package guide: [`/packages/README.md`](/packages/README.md). API details: [`/apps/api/README.md`](/apps/api/README.md).

## Local setup

```bash
vp install                 # or npm ci

# Web secrets (Wrangler / Vite Cloudflare plugin)
cp apps/web/.dev.vars.example apps/web/.dev.vars
# set independent random values for BETTER_AUTH_SECRET,
# INTERNAL_JOB_SECRET and RATE_LIMIT_FINGERPRINT_SECRET

# Auth worker secrets — BETTER_AUTH_SECRET must match web
cp apps/auth/.dev.vars.example apps/auth/.dev.vars

# API env
cp apps/api/.env.example apps/api/.env
# set DATABASE_URL + INTERNAL_JOB_SECRET (must match web)

# One shared D1 migration history, owned by apps/auth
cd apps/auth && npx wrangler d1 migrations apply futrob-app --local --persist-to ../web/.wrangler/state && cd ../..

# Postgres (organizations) — apply apps/api/migrations/*.sql to DATABASE_URL

npm run dev                # web (:3000) + api (:8787) + auth (:8788)
```

Align `INTERNAL_JOB_SECRET` between `apps/web/.dev.vars` and `apps/api/.env` or org BFF calls fail with 401.
Align `BETTER_AUTH_SECRET` between `apps/web/.dev.vars` and `apps/auth/.dev.vars` or login succeeds and BFF/SSR stay unauthenticated.
Set `FUTROB_API_BASE_URL=http://localhost:8787/api/v1` in `apps/web/.dev.vars`. Web reaches auth through the `AUTH_SERVICE` service binding, which Wrangler connects to the local `futrob-auth` Worker.
Keep `RATE_LIMIT_FINGERPRINT_SECRET` independent from every other secret. Before deploying the
Worker, provision it explicitly:

```bash
npx wrangler secret put RATE_LIMIT_FINGERPRINT_SECRET --config apps/web/wrangler.jsonc
```

Local `ENVIRONMENT=development` (see `apps/web/.dev.vars.example`) skips BFF rate limits so
club search and invitation routes work without `CF-Connecting-IP`. Outside development, the
five protected BFF routes fail closed with 503 when the binding is missing. Rate-limit window
and attempt overrides are optional Wrangler vars; the defaults are listed in
`apps/web/.dev.vars.example`.

## Docs

- [PRD](/product/prd.md)
- [Design system](/product/design-system-spec.md)
- [UI primitives](/packages/ui/README.md)
- [Architecture overview](/docs/architecture/overview.md)
- [Module boundaries](/docs/architecture/module-boundaries.md)
- [Packages and SDK](/docs/architecture/packages-and-sdk.md)
- [AGENTS.md](/AGENTS.md)
- Skill: [`.cursor/skills/futrob-hexagonal-module/SKILL.md`](/.cursor/skills/futrob-hexagonal-module/SKILL.md)
- Skill: [`.cursor/skills/futrob-cli/SKILL.md`](/.cursor/skills/futrob-cli/SKILL.md)

## Commands

```bash
vp install                 # or npm ci
npm run check              # vp check
npm run test               # vp test
npm run typecheck
npm run dev                # web + api + auth in parallel
npm run web                # apps/web only
npm run api                # apps/api only
npm run build              # vp build apps/web
npm run storybook          # catálogo UI + web en :6006
npm run storybook:build    # build estático de Storybook
npm run start -w @futrob/mobile
npm run ios -w @futrob/mobile
npm run android -w @futrob/mobile
npm run format             # vp fmt
npm run lint               # vp lint
npm run cli -- help
npm run cli -- domain-smoke
```

Vite+ lives at the repo root (`vite.config.ts`) and in `apps/web` — oxfmt, oxlint, and Vitest (`import … from "vite-plus/test"`). `apps/cli` stays on `tsx` and is only covered by root fmt/lint.
