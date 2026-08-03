---
name: futrob-hexagonal-module
description: Create or extend a Futrob hexagonal bounded context — domain/application in packages/@futrob/<bc>, adapters in the app. Use when adding BCs, use cases, ports, adapters, or server functions.
---

# Futrob hexagonal feature module

## When to use

Adding or changing a bounded context, use case, port, adapter, bridge, server function, or cross-module event in Futrob.

## Canonical layout

```text
packages/<context>/src/          # @futrob/<context>
├── domain/{entities,value-objects,errors,events,ports,policies}
├── application/<use-case-name>/
└── index.ts                     # public API of the package (no adapters)

apps/web/src/modules/<context>/
├── adapters/{persistence,bridges,observability,providers?}
├── server/
├── presentation/
└── index.ts                     # reexport @futrob/<context> (+ app-only exports)

Composition only in apps/web/src/di/<context>.module.ts
(and apps/api/src/di/ when that app exists).
```

## Module map (MVP)

`identity` · `organizations` · `competitions` · `teams` · `scheduling` · `game-data` · `results` · `statistics` · `analytics` · `notifications` · `public-portal`

Critical separation:

```text
scheduling → when/how many
game-data  → what providers report
results    → what counts officially
statistics → competitive projections
analytics  → premium interpretation
```

Never put EA-specific types in `results`/`statistics`/`scheduling`. EA lives under app adapters (`apps/web/.../game-data/adapters/providers/ea-clubs/`).

## Rules

1. Domain imports only TypeScript + `@futrob/shared-kernel` (+ own package types). No Zod, D1, fetch, Sentry, React.
2. Application depends on domain ports; never concrete adapters.
3. Package `index.ts` exports use cases/types/ports — never adapters, DB schemas, mappers, HTTP clients.
4. Cross-module: other `@futrob/<bc>` public API, reader ports + bridges in consumer adapters, or versioned events via outbox.
5. Persistence adapters target the app platform (web: D1/R2/Queues).
6. Tenancy: every tenant write/read scopes by `organizationId` in adapters.
7. Official stats update only after `results.official-result-approved`.

## Checklist for a new use case

1. Place folder under `packages/<bc>/src/application/<kebab-name>/` with `*.use-case.ts` (+ input type).
2. Add/adjust domain ports and errors in the package. **Expected failures are `TaggedError`
   classes** under `domain/errors/` (stable `code` for HTTP/i18n). See ADR-0011.
3. Export from `packages/<bc>/src/index.ts`.
4. Wire concrete adapters in `apps/web/src/di/<module>.module.ts` only.
5. Add thin `server/*.server.ts` when exposed to UI/API (validate input, call use case, unwrap Result).
6. If cross-module effect: emit domain event name from `shared/contracts/events/catalog.ts`.
7. Update `docs/architecture/module-boundaries.md` if ownership changes.
8. Add domain/application tests in the package with fake ports.

## Imports

- In packages: `@futrob/shared-kernel`, `@futrob/<other-bc>`, or relative within the package.
- In `apps/web`: `@futrob/<bc>` for business logic; `@/` for app-local `src/*`. Do not use `../` parent-relative across packages.

## Anti-patterns

- `routes` or `presentation` calling `env.APP_DB` / repositories
- Importing EA adapter paths from outside `src/di` or game-data adapters
- Writing `statistics` tables from `results` use cases
- Naming the provider context `ea-data` or bare `provider`
- Putting adapters inside `@futrob/<bc>`
- Path-aliasing another app into `apps/web/src/modules` for domain
