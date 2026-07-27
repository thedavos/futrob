# Futrob

Multi-tenant platform for EA SPORTS FC leagues and cups. MVP focus: **FC Clubs**, with provider-normalized match data, auditable official selection, rescheduling, standings, rankings, and a public portal.

## Status

Greenfield scaffold is in place under `apps/web`:

- Hexagonal **feature modules** in `apps/web/src/modules/*`
- Composition exclusively in `apps/web/src/di/`
- Cloudflare-oriented `wrangler.jsonc` bindings (D1, R2, Queues)
- Domain stubs for `game-data`, `results`, `scheduling`, `competitions`, `teams`

TanStack Start + `@cloudflare/vite-plugin` are wired in `apps/web`. Persistence adapters (D1) and auth are still to implement.

## Critical separation

```text
scheduling   → when / how many official slots
game-data    → what external providers reported (EA Clubs adapter)
results      → which matches count officially
statistics   → standings / rankings from approved results
analytics    → premium interpretation
```

## Stack

| Layer         | Choice                               |
| ------------- | ------------------------------------ |
| App           | TanStack Start + React (`apps/web`)  |
| Architecture  | Hexagonal feature modules + `src/di` |
| Runtime       | Cloudflare Workers                   |
| Data          | D1 + R2 + Queues + Cron              |
| Auth          | Better Auth + Futrob organizations   |
| UI            | shadcn / Base UI (`@futrob/ui`)      |
| Observability | Sentry at boundaries                 |

## Layout

```text
apps/
├── web/src/         # deployable (Workers)
│   ├── di/ bootstrap/ config/ context/
│   ├── modules/…
│   ├── routes/ shared/ workers/
└── cli/             # playground local de dominio — ver apps/cli/README.md

packages/
├── api-contracts/   # @futrob/api-contracts — Zod /api/v1
├── sdk/             # @futrob/sdk — cliente HTTP tipado
├── ui/              # @futrob/ui — tokens / shadcn
├── shared-kernel/   # @futrob/shared-kernel
└── test-support/    # @futrob/test-support
```

Guía de packages: [`/packages/README.md`](/packages/README.md).

## Docs

- [PRD](/product/prd.md)
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
npm run web                # apps/web only (TanStack Start + Cloudflare)
npm run api                # apps/api only (Hono/Node)
npm run build              # vp build apps/web
npm run format             # vp fmt (oxfmt via Vite+)
npm run lint               # vp lint (oxlint via Vite+)
npm run cli -- help
npm run cli -- domain-smoke
```

Vite+ lives at the repo root (`vite.config.ts`) and in `apps/web` — it provides oxfmt, oxlint, and Vitest (`import … from "vite-plus/test"`). `apps/cli` stays on `tsx` and is only covered by root fmt/lint.
