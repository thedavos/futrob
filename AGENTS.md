# AGENTS.md

## Mission

Build Futrob MVP (FC Clubs) per `product/`. Architecture: hexagonal feature modules on Cloudflare Workers.

## Read first

1. `product/prd.md`, requirements, glossary, open-decisions
2. `docs/architecture/overview.md`, module-boundaries, dependency-graph, ADRs
3. `.cursor/skills/futrob-hexagonal-module/SKILL.md`

## Preferred skills (by phase)

| Skill                     | Use for                                      |
| ------------------------- | -------------------------------------------- |
| `futrob-hexagonal-module` | Any module / use case                        |
| shadcn (+ Base UI)        | `packages/ui` primitives                     |
| better-ui                 | Screen visual quality                        |
| gsap                      | Landing / bracket motion (presentation only) |
| layers-domain             | Domain vocabulary before code                |
| layers-interaction-flow   | Captain / sync / officialize flows           |
| web-perf                  | Portal, lists, Workers budgets               |
| seo                       | Public landing + competition portal          |

Also: Cloudflare/wrangler, Sentry, TypeScript best practices. See `.cursor/rules/agent-skills.mdc`.

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
- EA specifics only in `apps/web/.../game-data/adapters/providers/ea-clubs/` (until api hosts its own egress adapters).
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
