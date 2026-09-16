---
name: futrob-hexagonal-module
description: Create or extend a Futrob hexagonal bounded context — domain/application in packages/<bc>, adapters in the app. Use when adding BCs, use cases, ports, adapters, or server functions.
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

apps/api/src/adapters/<context>/  # persistence, bridges, providers
apps/api/src/di/                 # product composition
apps/api/src/http/               # HTTP handlers/mappers

apps/web/src/modules/<context>/
├── server/
├── presentation/
└── index.ts                     # reexport @futrob/<context> (+ app-only exports)

Product composition in apps/api/src/di/<context>.module.ts.
Web BFF infrastructure in apps/web/src/{bootstrap,config,context}/.
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

Never put EA-specific types in `results`/`statistics`/`scheduling`. EA egress lives in `apps/api/src/adapters/game-data/ea-clubs/`; pure schemas/mappers live in `@futrob/ea-clubs` (ADR-0013).

## Rules

1. Domain imports only TypeScript + `@futrob/shared-kernel` (+ own package types). No Zod, D1, fetch, Sentry, React.
2. Application depends on domain ports; never concrete adapters.
3. Package `index.ts` exports use cases/types/ports — never adapters, DB schemas, mappers, HTTP clients.
4. Cross-module: other `@futrob/<bc>` public API, reader ports + bridges in consumer adapters, or versioned events via outbox.
5. Product persistence adapters live in apps/api (Postgres; in-memory for local development). Auth/actors and BFF rate limits use D1, with migrations owned by apps/auth.
6. Tenancy: every tenant write/read scopes by `organizationId` in adapters.
7. Official stats update only after `results.official-result-approved`.

## Checklist for a new use case

1. Place folder under `packages/<bc>/src/application/<kebab-name>/` with `*.use-case.ts` (+ input type).
2. Add/adjust domain ports and errors in the package. **Expected failures are `TaggedError`
   classes** under `domain/errors/` (stable `code` for HTTP/i18n). See ADR-0011.
3. Export from `packages/<bc>/src/index.ts`.
4. Wire product adapters in `apps/api/src/di/<module>.module.ts`.
5. Add thin HTTP handlers in `apps/api/src/http/` (validate input, call use case, unwrap Result); expose authenticated BFF routes in web through the SDK.
6. If cross-module effect: define the typed event beside its producer in the BC package and keep `apps/web/src/shared/contracts/events/catalog.ts` aligned. Packages never import that app-local catalog. Verify actual delivery wiring; the current API publisher is a no-op (see architecture overview).
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
