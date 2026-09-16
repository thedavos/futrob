# Pullfrog — Futrob repository context

Use this context alongside the specific task or PR review request. Read `AGENTS.md`, the relevant requirements and acceptance criteria in `product/`, and `docs/architecture/overview.md` before making architectural judgments. For UI work, read `design.md`; for bounded-context work, read `.cursor/skills/futrob-hexagonal-module/SKILL.md`.

The PRD describes target scope, not completed functionality. Verify claims against the checked-out code, scripts and tests. Earlier ADRs preserve historical topology; follow their current-topology notes and ADR-0013/0015. Report concrete defects with an affected path, trigger and consequence; distinguish verified failures from untested risks. Do not claim live Workers, Postgres, mobile-device or EA behavior from mocked tests alone.

## Architecture And Ownership

- Domain/application/ports live in `packages/<bc>` and are exported through each package's public API. Product adapters and composition live in `apps/api/src/adapters` and `apps/api/src/di` (Hono/Node on Railway).
- `apps/web` is TanStack Start on Workers: UI, authenticated BFF and provider Queue/Cron handlers. It calls the product API via `@futrob/sdk`; the old web business composition root has been removed.
- `apps/auth` owns Better Auth and actor provisioning in shared D1. Product persistence belongs to `apps/api` in Postgres; without `DATABASE_URL`, local stores are process-local and reset on API restart.
- `apps/mobile` is React Native + Expo and consumes the web BFF with the SDK and a Bearer session. Never expose `INTERNAL_JOB_SECRET` to browsers or mobile clients. BFF-to-API requests use service auth and a trusted `ActorId`.
- EA HTTP egress lives only in `apps/api/src/adapters/game-data/ea-clubs`; pure provider schemas/mappers live in `@futrob/ea-clubs`. Keep provider-specific types out of scheduling/results/statistics domain code.
- Keep scheduling, game-data, results, statistics and analytics separate. Sync never makes a match official. Cross-BC access uses public APIs, ports/bridges or explicitly wired events, never foreign adapters/tables.
- Expected domain/application/adapter failures use `TaggedError` from `@futrob/shared-kernel`. Reuse shared clock, IDs, transaction/event ports and time helpers instead of introducing equivalents.
- Authorize operations in use cases and scope tenant persistence by organization. Personal player data has actor/profile ownership and does not require organization membership. Presentation uses `EffectiveAccess` and fails closed while permissions are unavailable.

## API Testing

- Run route-focused HTTP tests with `npm run test -w @futrob/api -- --run src/http`.
- Run the complete API test suite with `npm run test -w @futrob/api -- --run`; integration tests that require external setup may be skipped by configuration.
- Run API typechecking with `npm run typecheck -w @futrob/api`.

## API Contracts

- Runtime `/api/v1/openapi.json` and `/api/v1/openapi.yaml` are served from `packages/api-contracts/src/v1/openapi/document.ts`, not directly from the generated files.
- After changing the OpenAPI source document, regenerate checked-in artifacts with `npm run generate:openapi -w @futrob/api-contracts`.
- Adding an SDK resource or response schema does not automatically update OpenAPI; verify the source document and both generated artifacts stay synchronized.

## Package Testing

- `@futrob/statistics` and `@futrob/results` both define `test: vp test` and have workspace Vite configs. Run focused package tests from the root with `npm run test -- --run packages/<package-path>`, or use their workspace scripts.
- Package typechecking is available through workspace scripts such as `npm run typecheck -w @futrob/statistics`.
- `npm run test -- --run <file> <file>` runs focused tests across multiple Vite+ projects. Use `--run` for a finite CI/agent invocation.
- A workspace `test: vp test` command resolves Vite+ project paths relative to that workspace; a workspace without its own Vite config can fail on paths such as `<workspace>/apps/web` instead of using the repository root.
- Root Vitest projects are explicitly listed in `vite.config.ts`; a new workspace needs a compatible test configuration and inclusion in that project list before root CI executes its tests.
- Root `npm run typecheck` uses `vp run -r typecheck`, so every workspace with a `typecheck` script participates automatically.

## Persistence Adapters

- When a repository has in-memory and PostgreSQL implementations, keep filtering and ordering semantics identical; mirrored in-memory queries must match explicit database ordering such as `occurred_at ASC`.
- Required-column migrations for existing rows must backfill from the authoritative relation or source data, not derive synthetic identifiers; test both clean setup and legacy rows.
- Apply every SQL migration in `apps/api/migrations` in filename order. Inspect existing migration integration tests before claiming legacy coverage; a clean-schema test alone does not validate a data transform. Add pre-migration fixtures for affected legacy rows. Postgres integration tests require `TEST_DATABASE_URL` and isolated test schemas.

## Scheduling

- `CompetitionRules` stores distinct `regularStage` and `knockoutStage` match rules, while encounter schedule snapshots carry `stageId`; stage-dependent scheduling adapters must resolve rules from the Encounter stage rather than use a competition-wide fallback.

## Auth And D1

- Better Auth form sign-in and sign-up endpoints validate the request `Origin`; a proxy that preserves browser headers must include every public web origin in the auth worker's `trustedOrigins`.
- Shared D1 has one migration history in `apps/auth/migrations`, including web BFF rate limits. Both Workers reference that directory. From `apps/auth`, local migration commands use `--persist-to ../web/.wrangler/state`; do not create a separate web migration history.
- Preserve the auth proxy's tested client-IP handling: strip incoming spoofable forwarding headers and derive `x-real-ip` from the trusted Cloudflare client IP for the `AUTH_SERVICE` subrequest. Keep proxy and auth rate-limit tests aligned.

## Web Testing

- Run a focused web test with `npm run test -- --run --project web apps/web/src/<test-file>.test.ts` from the repository root.
- Run web-only TypeScript validation with `npm run web:typecheck`.

## Statistics Projections

- Inspect `apps/api/src/di/create-modules.ts` before assuming event delivery: the current composition uses `NoopEventPublisher` and coordinates official confirmation/voiding with statistics projection transactionally. The documented cross-BC outbox is a target; provider Queue/Cron execution is a separate implemented path.

- `OfficialResult` snapshots may contain one or two official slots; standings must distinguish `independent_matches` from `aggregate_score` when converting slots into played matches and points.
- Competition rules expose both point values and resolution mode; a statistics rules adapter that reads only win/draw/loss points is insufficient for aggregate-score standings.

### Ranking Eligibility

- DEC-043's team-minute denominator must come from official team match-clock contributions, independently of player identity correlation; unmatched player rows stay out of ranking numerators but must not shrink the denominator.
- In this repository, each official match slot counts as a match for the default ranking floor; `aggregate_score` changes series resolution, not the number of official matches played.

## Web UI Conventions

- `design.md` is the sole design contract. Grafito + Lima is the current palette for both theme selectors; do not introduce a separate light palette. Use shared tokens, typography roles and primitives instead of local substitutes. Web uses StyleX; mobile uses native primitives and `@futrob/ui-tokens`.

- Runtime web translations come from `apps/web/src/shared/presentation/i18n/catalogs.ts` through `I18nProvider` and `useI18n`; adding entries only to root `messages/*.json` does not localize a component.
- Cursor-paginated web data should use the existing `useInfiniteQuery` and `getNextPageParam` pattern, then flatten the returned pages; rendering only the first response drops data when `nextCursor` is non-null.

## Player Statistics

- `PlayerGameOutcome` includes `unknown` when the listed club cannot be resolved to the match side; W-D-L aggregates exclude it, so form views must handle unknown-only and mixed histories explicitly.
- Player stat totals use numeric zero accumulators while averages become `null` when no provider values are known; presentation must inspect availability instead of treating total `0` as measured data.

## Web Charts

- Recharts `ResponsiveContainer` with percentage dimensions renders no chart until `ResizeObserver` measures the parent; jsdom tests need a `ResizeObserver` stub and explicit dimensions, while SSR is initially chartless unless `initialDimension` is provided.

## StyleX And UI Primitives

- `tools/stylex/vite-plugin.ts` enables `useCSSLayers`; keep global resets and focus rules in explicit layers or unlayered rules can outrank component StyleX declarations.
- StyleX class names are hashed; selectors based on literal class fragments such as `[class*="outline"]` are not stable behavior hooks. Use data attributes or semantic selectors instead.
- Base UI `className` and `style` props may be callbacks receiving component state; wrapper helpers must preserve callback semantics instead of filtering props to strings and plain objects.

## Web Validation

- For a full web migration check, run `npm run web:typecheck`, `npm run web:test -- --run`, and `npm run web:build` from the repository root.
- If newly declared imports report module-not-found after the dependency helper completes, rerun `npm ci` from the repository root before diagnosing source errors.
- For HTML probes, write the response to a temporary file before inspecting it instead of placing binary/NUL-containing output in shell command substitution.

## HTTP Test Harness

- API HTTP tests use `apps/api/src/http/http-app.harness.ts` for `buildApp`, `createFetch`, service headers, and shared fixtures.
- `buildApp` creates fresh modules and accepts an optional correlation-log array, allowing route test files to execute independently and in parallel.

## Cloud Agent Setup

- `.cursor/environment.json` supports an install command, startup terminals, and exposed ports; validate its shape against Cursor's environment schema when changing Cloud Agent setup.
- `.cursor/cloud-install.sh` must bootstrap nvm when absent, establish Node 24, and verify the active major version before running any npm command.
- The local web and API `INTERNAL_JOB_SECRET` values must match, as must web/auth `BETTER_AUTH_SECRET`. Keep rate-limit fingerprint secrets independent. The Cloud install script aligns the relevant gitignored env files.
- `npm run dev` starts web on 3000, API on 8787 and auth on 8788. Set web `FUTROB_API_BASE_URL=http://localhost:8787/api/v1`; auth is reached through `AUTH_SERVICE`.
- Use root npm scripts or `./node_modules/.bin/vp`; never `npx vp`. Node 24 or newer is required.

## Dependency Installation

- npm 11 install-script policy is configured through root `package.json` `allowScripts`; entries must match the resolved package identities in `package-lock.json`, including nested versions.
- After manifest/lockfile updates, validate affected installed workspace dependencies with `npm ls -w <workspace> --depth=0`; do not treat a successful install as proof that every resolved version is correct.

## Mobile Testing

- `apps/mobile` is included in the root Vite+ test project list. Run mobile tests with `npm run test -- --run --project mobile` and typecheck with `npm run typecheck -w @futrob/mobile`.
- The mobile Vite config includes only `src/**/*.{test,spec}.ts`; `.tsx` tests and tests under `app/` require an explicit include-pattern update.
- The current mobile shell loads onboarding, memberships and effective access through `loadAuthenticatedShell`. Test its observable authentication and permission behavior; do not assume the full product home or web/mobile feature parity is implemented.

## Mobile Auth

- Better Auth `bearer()` authenticates an existing bearer token; the documented mobile `GET /api/auth/get-session` endpoint is not a bearer-refresh protocol.
- The SDK does not automatically retry HTTP 401 responses. `session-lifecycle.ts` provides local session clearing for product 401s; the shell loader can return the login destination. Verify callers actually perform the required cleanup instead of assuming every login redirect clears SecureStore. Silent refresh requires an explicit auth contract first.
- Permission-gated mobile presentation must treat an absent allowed-permission set as empty; returning all gated items when capability data is unavailable is fail-open.

## Validation And Reporting

- Run `npm run check` and a finite `npm run test -- --run` for the required repository checks; use focused tests while iterating. Run workspace typechecks/builds when relevant to the change.
- Report exact commands, failures, skipped integrations and teardown warnings. A passed mocked suite does not establish production readiness; skipped database tests do not validate migrations.
- Keep runtime OpenAPI, generated contracts, SDK resources, implementation and affected docs aligned. Distinguish target requirements from implemented and verified behavior when updating documentation.
