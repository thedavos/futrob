# AGENTS.md

## Mission

Build Futrob MVP (FC Clubs) per `product/`. Architecture: hexagonal feature modules on Cloudflare Workers.

## Read first

1. `product/prd.md`, requirements, glossary, open-decisions
2. `docs/architecture/overview.md`, module-boundaries, dependency-graph, ADRs
3. `.cursor/skills/futrob-hexagonal-module/SKILL.md`

## Preferred skills (by phase)

See `.cursor/rules/agent-skills.mdc` for the full table and Cloud Agent availability.

| Skill                             | Use for                                          |
| --------------------------------- | ------------------------------------------------ |
| `futrob-hexagonal-module`         | Any module / use case                            |
| `futrob-cli`                      | Smoke-testing domain/API via `apps/cli` commands |
| layers-domain / user-needs        | Vocabulary and operator vs spectator jobs        |
| layers-interaction-flow           | Captain / sync / officialize flows               |
| layers-surface                    | Screen audit against the model                   |
| shadcn (+ Base UI)                | `packages/ui` primitives                         |
| better-ui / layout / a11y         | Visual pass, structure, 44 px targets            |
| better-typography / writing       | `typo-*` roles, ES/EN copy                       |
| better-colors                     | Contrast on existing semantic tokens             |
| design-empty-states               | Empty, filtered-empty, permission, error         |
| smooth-shadow-ring                | Elevated surfaces (never `border` + `shadow`)    |
| gsap                              | Landing / bracket motion (presentation only)     |
| tanstack-start / query            | Routes, SSR, client `/api/v1` state (ADR-0012)   |
| web-perf / seo                    | Portal budgets; crawlable published content only |
| wrangler / workers-best-practices | D1, R2, Queues, Cron, Workers runtime            |
| sentry-instrument                 | Execution boundaries                             |
| typescript-best-practices         | Contracts and typed boundaries                   |

## UI system contract

- Read `product/design-system-spec.md` and `packages/ui/README.md` before UI work.
- Light is the default across marketing, product and public portal. Dark is explicit opt-in.
- Controls are 44 px. `dense` is the only compact mode: 36 px on desktop and 44 px on touch.
- Use flat/line hierarchy; ambient elevation uses `smooth-shadow-ring-*` on overlays and
  opt-in `Card`/`EmptyState` `variant="elevated"` / `Alert elevation="elevated"`.
  Never pair `border`/`ring` with `shadow`.
- Green means brand/primary action. Use the separate `approved` semantic token only for
  officially approved results.
- Use `typo-label` for labels and navigation; use `typo-caption` for metadata, hints and secondary sentence-case copy; use `typo-subtitle` for support lines under headings.
- `ButtonIcon` is marketing CTA language, not an operator/table embellishment.
- Variants are closed. Do not invent new primitive colors or sizes with `className`.
- Icons: Phosphor (`@phosphor-icons/react`, exports `*Icon`, weight `regular`). Type icon props with `Icon` from `@futrob/ui`.
- Build forms, navigation, tables/rows and overlays from `@futrob/ui`.
- Update Storybook whenever a primitive contract or state changes.

## Code shape

- Deployable Must: `apps/web` (TanStack Start → Cloudflare Workers)
- Deployable de API de producto: `apps/api` (Hono/Node en Railway; consume `@futrob/<bc>`, dueño de Postgres `DATABASE_URL` y egress Node a EA)
- CLI local: `apps/cli` — playground (no deployable de producto); ver `/apps/cli/README.md`
- Móvil: `apps/mobile` — React Native + Expo (Expo Router); consume `/api/v1` vía `@futrob/sdk`; primitivas RN en `apps/mobile/src/ui/`; tokens compartidos en `packages/ui-tokens`
- Business logic: `packages/<bc>/` (`@futrob/game-data`, `@futrob/results`, …) — domain + application + ports
- App modules (adapters/server/UI): `apps/web/src/modules/<context>/`
- Composition web: `apps/web/src/{di,bootstrap,config,context}/`
- Shared web infra: `apps/web/src/shared/` (reexporta kernel; infra de Workers)
- Workers: `apps/web/src/workers/`
- Packages también: `api-contracts`, `sdk`, `ui`, `shared-kernel`, `test-support` — ver `/packages/README.md`

MVP BCs: identity, organizations, competitions, teams, scheduling, **game-data**, results, statistics, analytics, notifications, public-portal. `billing` out of MVP.

## Rules

- Domain/application en `@futrob/<bc>`; adapters (D1/R2/Queues/EA) solo en apps.
- `packages/<bc>/src/index.ts` public API only; never export adapters.
- Antes de crear un port genérico, buscar contratos equivalentes. Ports transversales y
  agnósticos de dominio con la misma semántica se definen una sola vez en
  `@futrob/shared-kernel` (por ejemplo `ClockPort`, `IdGeneratorPort`,
  `TransactionPort`, `EventPublisherPort`) y se reutilizan desde los BCs y apps.
  No centralizar ports que expresen vocabulario o reglas propias de un bounded context.
- Cross-module via package public API, ports/bridges, or outbox events — never foreign adapters/tables.
- EA egress lives only in `apps/api/.../game-data/adapters/ea-clubs/` (see
  [ADR-0013](/docs/adr/0013-ea-egress-api-only.md)); web reaches EA data through the product API.
- Official stats only after `results.official-result-approved`.
- Organization-scoped D1 queries; no Postgres RLS / Supabase / Vercel as Must.
- **Expected failures:** domain/application/adapter errors use `TaggedError` from
  `@futrob/shared-kernel` (stable `code` for wire/i18n; see
  [ADR-0011](/docs/adr/0011-tagged-errors.md)). Zod/`api.*`/auth wire and `Panic`
  (defects) stay outside TaggedError.

## Separation

```text
scheduling ≠ game-data ≠ results ≠ statistics ≠ analytics
```

## Commands

```bash
vp install          # preferred (or npm ci)
npm run check       # vp check — fmt + lint + type-aware
npm run test        # vp test
npm run typecheck   # tsc across workspaces
npm run dev         # web + api (parallel)
npm run web         # web only
npm run api         # api only
npm run build       # vp build apps/web
npm run storybook
npm run storybook:build
npm run cli -- help
```

`apps/cli` has no local Vite+ app config — only root fmt/lint. Do not claim Workers/EA integrations work without direct evidence.

## Cursor Cloud specific instructions

Standard commands live in the `## Commands` section above and in `README.md` / `apps/api/README.md`; only the non-obvious startup caveats are captured here.

- **Node 24 is required** (`engines.node >=24`). `.cursor/cloud-install.sh` bootstraps nvm if it is missing, installs/selects Node 24, and **exits** if `node --version` is still below 24 (the Cloud image may also expose Node 22 at `/exec-daemon/node`). New shells source `~/.bashrc` for nvm's Node 24; if `node --version` ever shows 22, run `source ~/.bashrc`.
- **`vp` is not installed globally.** Run tooling through the root `npm run` scripts (`dev`, `check`, `test`, `build`, `web`, `api`); npm puts `node_modules/.bin/vp` on `PATH` for them. For a direct call use `./node_modules/.bin/vp`, never `npx vp`.
- **Local env files are gitignored and must exist to run the app**: `apps/web/.dev.vars` and `apps/api/.env`. Their `INTERNAL_JOB_SECRET` values **must match**, or the web BFF → API org/onboarding calls fail with 401. Set `FUTROB_API_BASE_URL=http://localhost:8787/api/v1` in `apps/web/.dev.vars` so the BFF does not use the production URL from `wrangler.jsonc`. The Cloud install script copies the examples and aligns that secret. Create them the same way locally from `apps/web/.dev.vars.example` and `apps/api/.env.example`.
- **D1 (auth) local state** lives at `apps/web/.wrangler/state` and is shared by the `vp dev` Cloudflare plugin. If it's reset, re-run `cd apps/web && npx wrangler d1 migrations apply futrob-app --local` (non-interactive when stdin is not a TTY). Sign-up/login need this migration applied.
- **Postgres is optional locally.** Without `DATABASE_URL`, `apps/api` uses process-local in-memory stores (`/api/v1/meta/health` reports `db: "skipped"`). Consequence: organizations/onboarding data is lost whenever the API restarts — and `apps/api` runs under `tsx watch`, so editing API files hot-restarts it and wipes those in-memory orgs. Set `DATABASE_URL` + apply `apps/api/migrations/*.sql` for durable data.
- **Native install scripts**: only `esbuild`, `sharp`, and `workerd` are allowlisted (by name) in `package.json` `allowScripts` so they can fetch platform binaries. Cloud `npm ci` uses `--strict-allow-scripts` so any other lifecycle script fails the install instead of being skipped. Do not use `dangerously-allow-all-scripts`.
- **Ports**: web `http://localhost:3000`, api `http://localhost:8787` (`/api/v1`). `npm run dev` runs both in parallel.
- **Skills**: only `.cursor/skills/` in this repo is guaranteed on Cloud Agents. Preferred user/plugin skills are listed in `.cursor/rules/agent-skills.mdc`; follow the matching rules when those skill files are not in the checkout.

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->
