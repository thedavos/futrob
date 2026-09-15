# Portal público

Research only. No product code in this change.

Notion pages in this package are blank except for database properties. The facts below come from those properties, from `product/`, from architecture docs, and from the current tree on `main`.

throughput checkpoint: n/a, read-only investigation

## Source

- Package dump. `uploads/portal-publico.json` (saved as `portal-publico_e426.json` in the agent upload). Five tasks under epic Portal público.
- Epic page. [Portal público](https://app.notion.com/p/3dc7b204009a815e88a9d3f10ae6760c). Acceptance. Spectators see portada, calendario, tabla, bracket, equipos, jugadores, and rankings or premios, with no admin access. Responsive and shareable.
- Related card outside this package. [Mostrar rankings y premios por posición en portal público](https://app.notion.com/p/3d77b204009a8143b7f6e3ea2f668a88). QA in this package depends on it. The rankings backend is already on `main`.

## Overview

`@futrob/public-portal` is a named MVP bounded context with no use cases. The web module reexports that empty public API. Spectators have no competition URL.

Standings and rankings HTTP exist on `apps/api` only. They sit behind `createServiceAuthMiddleware` and `STATISTICS_PERMISSION.read`. That permission is for organizer, org staff, competition staff, and superuser. Captains and players do not get it from role bundles. The web BFF has no standings, rankings, or fixture routes, so the authenticated web app cannot load those resources through `:3000`. DTOs still carry `organizationId` and `playerProfileId`. `jsonResponse` always sends `cache-control: no-store`.

The landing at `/` is the only public HTML surface besides `/login` and `/signup`. Root OG tags describe Futrob, not a competition. Design requires a portal with competition header and sticky tabs, and no admin sidebar.

## Key concepts

- Spectator. Glossary actor for the public portal. Not an RBAC role. `CompetitionMembershipRole` is `staff`, `captain`, or `player`.
- Public portal. Surface of a published Competition. Sanitized projections only. FR-16, FTR-PUB-001, FTR-RBAC-002, AC-WEB-003, UX-PUB-001 through UX-PUB-003.
- Official projections. Table, bracket, rankings, and public results update only after `results.official-result-approved`. AC-SEL-002. Disagreement does not update public projections until resolved.
- RankingSnapshot. Statistics read model. Kinds `scorer`, `assister`, `rating`, `mvp`, `goalkeeper`. Eligibility is DEC-043. Default is 3 matches or 60 percent of team minutes. Ineligible players are omitted from rows. They are not flagged.
- Private `/api/v1`. ADR-0005 and WONT-09. No third-party public API. A first-party anonymous portal is still allowed. OpenAPI title is "Futrob Private API."
- Premios. FR-14 and module-boundaries assign prizes to statistics. There is no `Prize` type, table, or HTTP. `RankingRow.position` is rank order.
- Sanitization. An allowlisted public DTO. Not the private statistics DTO with a few keys deleted in the route.

## How it works today

A spectator has nowhere to go. `/` is marketing. `/_app` redirects anonymous users to `/login`.

An authenticated organizer can read official snapshots through org-scoped `apps/api` paths. CLI `standings` uses that path. The web Worker BFF does not proxy it.

1. CLI or a future BFF sends `Authorization: Bearer INTERNAL_JOB_SECRET` and `X-Futrob-Actor-Id`.
2. `GetCompetitionStandingsUseCase` and `GetCompetitionRankingsUseCase` require `STATISTICS_PERMISSION.read`.
3. HTTP maps the domain snapshot 1:1. Rankings rows keep `playerProfileId`. Snapshots keep `organizationId`.
4. `jsonResponse` sets `cache-control: no-store`.

`PublishCompetitionUseCase` moves a draft to `published` when rules are valid and at least two entries are approved. That lock enables fixture generation. It does not create a slug, cover, or public read model.

Projection after confirm runs in-process in `confirmOfficialSelectionAndProject`. `apps/web/src/workers/statistics-projection.worker.ts` is a stub. Portal freshness is "after confirm returns", not "after a queue consumer".

`statistics.rankings-updated` exists for cache invalidation later. Nothing in public-portal consumes it.

## Where things live

| Area | Path | State |
| --- | --- | --- |
| BC package | `packages/public-portal/src/index.ts` | `export {}` |
| Web facade | `apps/web/src/modules/public-portal/index.ts` | reexport only |
| DI | `apps/web/src/di/` and `apps/api/src/di/` | no public-portal module |
| Private standings HTTP | `apps/api/src/http/routes/competitions.ts` `GET .../standings` | secured |
| Private rankings HTTP | same file, `GET .../rankings` | secured |
| Rankings domain | `packages/statistics/src/domain/entities/ranking-snapshot.ts` | on `main` |
| Rankings rebuild | `packages/statistics/src/application/rebuild-competition-rankings/` | on `main` |
| Eligibility | `packages/statistics/src/domain/policies/ranking-eligibility.ts` | DEC-043 tests |
| Operator rankings nav | `apps/web/src/shared/presentation/shell/nav-registry.ts` | stub |
| Provider match "ranking" | `apps/web/src/modules/statistics/presentation/provider-match-detail-ranking.ts` | authenticated EA match UI. Not the portal. |
| Cache headers | `apps/api/src/utils/http-response.ts`, `apps/web/src/shared/infrastructure/http/api-response.ts` | `no-store` |
| OG defaults | `apps/web/src/routes/__root.tsx` | site-wide Futrob image |
| Landing meta | `apps/web/src/routes/index.tsx` | title and description only |
| Token redaction | `apps/web/src/modules/organizations/presentation/invitation-share-url.ts` | invitations, not portal |

## Gotchas

- Reusing `GetCompetitionRankingsUseCase` for anonymous reads fails the auth gate. Captains and players also fail it. The DTO leaks internal ids if returned as-is.
- Putting `organizationId` in a public URL repeats an identifier FTR-PUB-001 treats as internal.
- `provider-match-detail-ranking.ts` ranks players inside one ProviderMatch. That path is EA-derived and authenticated. It must not back the public rankings tab.
- Operator competition tabs for fixture, standings, bracket, and rankings are stubs. Nav shows them only when the actor has `COMPETITION_PERMISSION.update`, not `statistics.read`. Building the portal is not a restyle of those screens.
- There is no HTTP list or get for `OfficialResult`. Resultados cannot reuse a private list because none exists. The entity stores provider refs, external club ids, and player stat lines in `slots`.
- `PlayerProfile` is `{ id, actorId, createdAt }`. Ranking `displayName` on contributions is provider-sourced. Public names need an explicit join, not the private snapshot.
- `CompetitionRules` is structured match rules. There is no free-text reglamento field.
- `PlayerCompetitionStatsRepository` has no `listByCompetition`. Jugadores cannot be built from that port today.
- Landing club search calls the authenticated BFF. Anonymous visitors get 401. That is not a portal read.
- `__root.tsx` points `og:image` at `/og/futrob-default.png`. The repo has `apps/web/public/og/futrob-default.svg` only.
- `e2e-golden-path` stops at fixture. Verify-futrob says the public competition portal has no public routes.
- Sentry inits with `sendDefaultPii: false` and has no `beforeSend` allowlist for EA payloads. That is an observability gap. It is not a portal sanitizer.
- ADR-0009 rejects Vercel CDN. Cache work belongs on Cloudflare Workers Cache, Cache Rules, or Cache API.
- Team performance ranking 0 to 100 (FTR-RNK-001, AC-RNK-001) is Should and absent. Do not invent it on the portal.

## Hexagonal placement for later implementation

Not implemented here. Recorded so the five tasks do not dump portal rules into `statistics` or into a route handler.

- Domain and application stay in `packages/public-portal`.
- Use cases take a public competition key and return allowlisted projections. No `ActorId`. Gate is competition status, not `STATISTICS_PERMISSION.read`.
- Reader ports live in public-portal. Bridges in `apps/api` (and later web DI if SSR talks to use cases) call competitions, scheduling, teams, and statistics public APIs or repositories. They never import EA adapters.
- HTTP for spectators is a new unauthenticated route group. Suggested prefix `/public/competitions/:publicId/...`. Do not add `?public=true` to org-scoped private routes.
- Presentation lives in `apps/web/src/modules/public-portal/presentation/` and in public TanStack Start routes outside `/_app`.
- Sanitization is one domain policy or mapper. Tests assert the literal public JSON. They do not assert that a strip function was called.

Competition has no slug field today. Public URL shape is an open product decision. Until that lands, tests can use an opaque competition id as `publicId` and still forbid `organizationId` in the public body.

---

## Task 1. [API] Lecturas públicas sanitizadas

- Notion. [Lecturas públicas sanitizadas](https://app.notion.com/p/3dc7b204009a8185934ad9915b43db01)
- Type. Backend. P1. Fase 5.
- Acceptance. Public endpoints for portada, calendario, tabla, bracket, equipos, and jugadores sanitize data. No admin fields. No EA payloads.
- Deps. Portal card (epic / Construir portal público de competición).

### Context

FR-16 asks for a published competition portal with sanitized portada, reglamento, equipos, calendario, resultados, tabla, bracket, rankings, and public profiles. FTR-PUB-001 forbids private data, tokens, internal platform ids, and raw EA payloads. AC-WEB-003 is the Given, when, then form of that rule.

`packages/public-portal` has `package.json`, `tsconfig.json`, and an empty `index.ts`. The same empty-stub shape exists in `packages/analytics` and `packages/notifications`. Architecture already assigns this BC "lecturas públicas sanitizadas" and "read models publicados". The DAG in `docs/architecture/dependency-graph.md` lets public-portal read Statistics and Competitions through public APIs, ports, or events.

Private reads that look similar and must not be reused as the public contract:

- `GET /organizations/:organizationId/competitions/:competitionId` returns `CompetitionDto` with `organizationId`.
- `GET .../standings` and `GET .../rankings` require `STATISTICS_PERMISSION.read`.
- `GET .../participants` requires `COMPETITION_PERMISSION.participantsRead` and returns entry rows, not a spectator roster.
- `GET .../fixtures/:fixturePlanId` requires actor, organization, competition, and a plan id the spectator does not have.
- `GET /encounters/:encounterId/candidates` is the EA candidate list. It must never become a public encounter payload.
- `GET /game-data/clubs/...` and `GET /players/me/recent-matches/...` carry provider observations.
- There is no `GET` for official results. `OfficialResultReaderPort.listByCompetition` is used by rebuild, not by a query HTTP.

`jsonResponse` is the wrong helper for cacheable public GET. It is the right default for private API.

### Paths and symbols

- `packages/public-portal/src/index.ts`
- `PublishCompetitionUseCase` in `packages/competitions/src/application/publish-competition/publish-competition.use-case.ts`
- `Competition.status` in `packages/competitions/src/domain/entities/competition.ts`
- `CompetitionRules` in `packages/competitions/src/domain/entities/competition-rules.ts`
- `GetCompetitionStandingsUseCase`, `GetCompetitionRankingsUseCase`
- `createServiceAuthMiddleware`, `ACTOR_ID_HEADER`
- `competitionDto`, `teamDto`, `rankingSnapshotSchema`, `rankingRowSchema`
- `RawProviderObservation.payload` in `packages/game-data/src/domain/entities/raw-provider-observation.ts`
- Event `results.official-result-approved` in `apps/web/src/shared/contracts/events/catalog.ts`
- `OfficialResult.slots` in `packages/results/src/domain/entities/official-result.ts`
- `GetCompetitionDraftUseCase` (no auth inside; HTTP wraps it)
- `PlayerCompetitionStatsRepository`
- `apps/web/src/workers/statistics-projection.worker.ts` (stub)

### Gaps

- No public-portal use case, port, error, or event.
- No unauthenticated product routes besides meta.
- No public DTO in `packages/api-contracts` and no SDK resource for spectators.
- No public display-name join. Rankings and standings key rows by `playerProfileId` and `teamId` only.
- No list-encounters-by-competition for a calendar without a `fixturePlanId`. Fixture GET has no scores and keeps generation, seed, and series internals.
- No HTTP for official results. Resultados and scored brackets have no private list to wrap.
- No public bracket read model. Knockout layout lives in scheduling fixture generation. Operator `/bracket` is a stub.
- `CompetitionRules` has no prose reglamento. Portada has no cover, description, or slug fields.
- `PlayerProfile` has no public display name. `PlayerCompetitionStatsRepository` cannot list a competition.
- Draft, archived, and unpublished competitions have no defined anonymous 404.
- Internal ids (`organizationId`, `playerProfileId`, `gameAccountId`, `createdByActorId`, invitation tokens) have no public allowlist test.

### Behavior tests

See `portal-publico.tests.json` ids `api-01` through `api-12`.

Call the future public use case or HTTP the way a spectator would. Assert the literal JSON. A test that only checks `toHaveBeenCalled` on a strip helper does not count.

### Notas

Notion. `[API] Portal público. packages/public-portal vacío hoy.`

Measured. The package is still empty on this `main`. Private standings and rankings HTTP exist on `apps/api` for staff with `statistics.read`. They are not a public contract. Captains and players cannot call them. The web BFF does not proxy them.

---

## Task 2. [UI] Portada, calendario, tabla, bracket, equipos, jugadores

- Notion. [Portada, calendario, tabla, bracket, equipos, jugadores](https://app.notion.com/p/3dc7b204009a81028ef1d117bd836a70)
- Type. Frontend. P1.
- Acceptance. Responsive portal. Portada, calendario, tabla, bracket, equipos, jugadores. Shareable.
- Deps. API públicas.

### Context

Design (`design.md`) splits operator chrome from the portal. Authenticated layout uses contextual nav and a sidebar or sheet. The portal uses a competition header and horizontal sticky tabs. No admin sidebar. UX-PUB-001 forbids captain and organizer actions. UX-SCP-003 hides destinations that the format does not use, for example bracket on a pure league.

FR-16 also lists reglamento, resultados, rankings, and public profiles. This UI card's acceptance text omits rankings. Rankings have their own frontend card. The epic acceptance includes rankings. Implementers should ship the six screens named here against public reads, and leave ranking lists to the rankings card unless this screen set already has a Rankings tab shell.

`AC-WEB-002` requires distinguishable loading, empty, error, and success for organizer versus spectator. `design.md` empty-state rules apply. Format-inapplicable routes are omitted. Applicable routes with no data use an empty state.

Operator competition home at `/orgs/$orgId/competitions/$competitionId/` is an authenticated placeholder. It is not a portal portada.

i18n. Spanish default, English pair. No locale prefix in URLs unless a routing ADR adds one. Catalog already has landing copy about a public portal. It has no portal screen keys.

Mobile. DEC-007 and FTR-MOB-001. Landing and portal stay web. Native apps should open those URLs. `apps/mobile` declares scheme `futrob` and depends on `expo-linking`. No import uses it. No associatedDomains or intent filters.

### Paths and symbols

- `apps/web/src/routes/_app.tsx` (auth wall)
- `apps/web/src/routes/_app/orgs/$orgId/competitions/$competitionId/index.tsx`
- `organizationCompetitionContext` in `nav-registry.ts` (operator tabs, several `stub: true`)
- `design.md` sections Portal público, UX-PUB-*, UX-STD-001, UX-BRK-001, UX-BRK-002
- `apps/web/src/shared/presentation/landing/audiences-section.tsx`
- `@futrob/ui` composition. StyleX in presentation. No second visual language.

### Gaps

- No public route tree. Needed screens include portada, calendario, tabla, bracket, equipos, and jugadores, plus encounter deep links that show the public projection only.
- No portal header or tab component in `apps/web/src/modules/public-portal/presentation/`.
- Operator stubs must not be reused with the authenticated shell.
- No empty or error or 404 for unpublished competitions.
- No `es` and `en` message keys for portal chrome. Landing portal strings are marketing only.
- `/player/competitions/explore` is an authenticated stub. It is not a public directory.
- Landing club search is not a public read. It uses `createAuthenticatedProductApiClient`.
- Shareable URLs need typed search or path state for the active tab. TanStack Start already prefers typed URLs for that.

### Behavior tests

See `ui-01` through `ui-08`. Prefer route or component tests that render public fixtures. Assert visible copy and the absence of operator CTAs. A screenshot without interaction is not enough for the later implementation PR.

### Notas

Notion. `[UI] Portal público. Complementa la card existente de portal.`

The existing portal card is [Construir portal público de competición](https://app.notion.com/p/3a07b204009a81ad8484c69ed4a2804e). Same screens, still Not started. This UI task is the breakdown of that card, not a second product.

---

## Task 3. [Feature] Share / OG meta / deep links públicos

- Notion. [Share / OG meta / deep links públicos](https://app.notion.com/p/3dc7b204009a815ca567df9b80d931a1)
- Type. Feature. P1.
- Acceptance. OG, meta, and public deep links let people share a competition without exposing private data.
- Deps. UI portal.

### Context

Root `head` in `__root.tsx` sets `og:title`, `og:description`, and `og:image` to Futrob defaults (`/og/futrob-default.png`, 1200×630). The tracked asset is `apps/web/public/og/futrob-default.svg`. Landing overrides `title` and `description` only. Crawlers that read `og:title` still see the site-wide string. `design.md` asks production public routes for an absolute `og:image` and a canonical URL.

`tanstack-start.mdc` says public landing and portal content that benefits from SEO should not be client-only. `AGENTS.md` SEO line. Crawlable published content only.

Deep links already exist for invitations. `redactInvitationTokenFromPath` strips tokens from telemetry. UX-NAV-014. Portal deep links must not put invitation tokens, actor ids, or candidate ids in the URL. Design. Encounter deep links show the public projection, never captain actions.

Mobile README. Landing and portal open as web URLs from the app. There is no Expo `Linking` handler for a competition portal.

No `robots.txt` or sitemap in `apps/web`.

### Paths and symbols

- `apps/web/src/routes/__root.tsx` `localeOpenGraphCode`, `og:image`
- `apps/web/src/routes/index.tsx` `landing.meta.title`
- `redactInvitationTokenFromPath`
- `apps/web/src/routes/_app.tsx` `isBareAuthenticatedRoute` (invitation accept stays outside the product shell)
- `design.md` Portal público paragraph on encounter deep links

### Gaps

- No per-competition `head()` with sanitized name, description, and image.
- Landing does not override `og:*` or Twitter tags.
- No canonical URL helper for a public competition.
- No `og:url`.
- No robots or sitemap limited to published portal paths.
- No share sheet or copy-link control on portal chrome.
- `og:image` PNG is missing from `apps/web/public/og/`.
- Mobile has no universal-link or `futrob://` mapping for landing or portal.
- Unpublished or draft URLs must not emit indexable OG that reveals the draft name if product later treats drafts as secret. Today drafts are only reachable when authenticated, so the failure mode is a future public route that forgets the publish gate.

### Behavior tests

See `share-01` through `share-06`. Assert literal meta tags from the route `head` output or from the SSR HTML. Assert the HTML does not contain dispute text, tokens, or raw provider JSON.

### Notas

Notion. `[Feature] Portal público.`

OG work is presentation. It still must consume the same sanitized public read as the API task. Do not SSR the private competition DTO into `<meta>` tags.

---

## Task 4. [QA] No filtrar datos privados ni payloads EA

- Notion. [No filtrar datos privados ni payloads EA](https://app.notion.com/p/3dc7b204009a8188bcfff57592ce987b)
- Type. QA. P1.
- Acceptance. A suite verifies the portal does not leak private data or provider payloads.
- Deps. API sanitizada. Rankings portal card.

### Context

This is the executable form of FTR-PUB-001, AC-WEB-003, and UX-PUB-002. It must cover the public API, the SSR HTML, OG tags, and the rankings tab once that UI exists.

Current tests that say "sanitized" are not a portal anti-leak suite.

- Invitation preview returns sanitized competition context. Still authenticated.
- Provider health returns a sanitized snapshot to platform admins.
- BFF maps unexpected failures to safe 503 bodies.
- Auth proxy asserts `cache-control: no-store`.
- Game-data tests append `RawProviderObservation`. They do not assert that public HTTP omits `payload`.
- Statistics ranking tests assert `playerProfileId` in the private snapshot. That is the opposite of a public allowlist.
- Encounter candidate tests strip `players` to `playerObservationCount`. That is operator HTTP, not a portal suite.
- EA HTTP error tests drop `game_data.ea_clubs_*` details. They do not cover public JSON.

Forbidden classes to encode as literal absences in JSON or HTML:

- `Authorization` secrets, session cookies, `INTERNAL_JOB_SECRET`, invitation tokens
- `RawProviderObservation.payload`, provider `endpointKey`, unsanitized match bodies
- Dispute free text, captain selection candidates, `GET /encounters/:id/candidates` shapes
- `gameAccountId`, `createdByActorId`, grant rows, membership emails
- `organizationId` in public bodies if FTR-PUB-001 treats it as an internal platform id
- Analytics premium fields (DEC-044). Percentiles, evolution, comparatives stay off the portal

Rankings-specific. Public lists may show position, public name, team public name, value, matches, minutes, kind, formula version, and eligibility. They must apply DEC-043. They must not show ineligible rows that `buildCompetitionRankings` already dropped, then re-join extra provider stats.

### Paths and symbols

- FTR-PUB-001, AC-WEB-003, UX-PUB-002
- `rankingRowSchema.playerProfileId`
- `GET /encounters/:encounterId/candidates`
- `RawProviderObservation`
- `.cursor/rules/sentry.mdc` redaction allowlist (telemetry, not HTTP)
- `packages/statistics/src/domain/policies/build-competition-rankings.test.ts`
- Related UI. [Mostrar rankings y premios por posición en portal público](https://app.notion.com/p/3d77b204009a8143b7f6e3ea2f668a88)

### Gaps

- No test file under public-portal.
- No HTTP fixture that compares organizer versus anonymous bodies for the same competition.
- No crawl of HTML or JSON for EA payload keys (`clubsInfo`, `playerMatchEaId`, and similar adapter fields).
- Rankings portal UI does not exist, so the QA card cannot pass until that card and the API land.
- Sentry has no portal-specific redaction test.

### Behavior tests

See `qa-01` through `qa-08`. Each test feeds a fixture that contains private fields and asserts they are absent from the spectator artifact. Include a positive assertion of an allowed field in the same test so the suite fails if the handler returns `undefined`.

### Notas

Notion. `[QA] Portal público.`

Do not call this done by grepping the repo for the word sanitized. The suite has to run against public handlers and HTML.

---

## Task 5. [Infra] Caching / CDN de lecturas públicas

- Notion. [Caching / CDN de lecturas públicas](https://app.notion.com/p/3dc7b204009a81618902f37b83914e45)
- Type. Feature on the board. P2.
- Acceptance. Public reads are cacheable (CDN or cache headers) without serving authenticated data by mistake.
- Deps. API públicas.

### Context

Every JSON helper in the product API and the web BFF sets `cache-control: no-store`. Auth proxy tests lock that for the 503 binding-missing path. Successful `/api/auth/*` responses pass Better Auth headers through. The proxy strips `cf-*` and forwards `Set-Cookie`. Auth worker `Response.json` health and error paths set no Cache-Control.

SSR HTML sets no Cache-Control and no `Vary`. Landing still runs with cookies present. A later Cloudflare HTML cache without `Vary: Cookie` could mix sessions.

`apps/web/wrangler.jsonc` has no Cache Rules, no KV, and no Cache API binding. There is no `caches.default` usage. ADR-0009 hosts web on Cloudflare Workers. It allows KV or Durable Objects as freshness aids, never as competitive truth. Standings and rankings stay in Postgres via `apps/api`.

`provider_response_cache` is EA club search and club info in Postgres. It is not a public CDN. Recent matches bypass it.

`statistics.rankings-updated` and `statistics.competition-stats-rebuilt` are the natural purge signals. `results.official-result-approved` is the source event. Caching stale official data is allowed for a short TTL. Caching a private session response under a public key is not.

Locale is not in the URL. If HTML varies by `Accept-Language` or locale cookie, `Vary` must list that input or the HTML must be locale-neutral and translated on the client. i18n rules prefer no locale prefix.

Do not use Vercel CDN, ISR, or `x-vercel-cache`. Those are out of platform.

### Paths and symbols

- `jsonResponse` in `apps/api/src/utils/http-response.ts`
- `jsonResponse` in `apps/web/src/shared/infrastructure/http/api-response.ts`
- `apps/web/src/modules/identity/server/auth-proxy.test.ts` (`cache-control` `no-store`)
- `apps/web/wrangler.jsonc`
- Locale cookie `futrob_locale` in `apps/web/src/shared/presentation/i18n/locale.functions.ts`
- `CachedGameDataProviderAdapter` (EA club cache, not portal)
- Events `statistics.rankings-updated`, `statistics.competition-stats-rebuilt`, `results.official-result-approved`

### Gaps

- No `Cache-Control: public` path.
- No `s-maxage` or `stale-while-revalidate` policy.
- No guarantee that public routes omit `Set-Cookie`.
- No `Vary` policy for authorization or locale. Public GET must ignore `Cookie` and `Authorization` as cache keys, and must not be stored if those headers were used to produce the body.
- SSR HTML has no cache header at all.
- No purge on rankings or standings rebuild.
- No split between private `no-store` helpers and a new public response helper. Reusing `jsonResponse` as-is cannot meet the acceptance text.

### Behavior tests

See `cache-01` through `cache-07`. Assert literal header strings. Assert that a request with a session cookie still either bypasses the public cache or returns the same sanitized anonymous body, never the organizer projection.

### Notas

Notion. `[Infra] Portal público. Tipo Feature en board.`

Priority P2. Ship after public GET exists. Caching a 401 from a missed auth header would be a new leak mode. Write the auth-separation test before enabling `public`.

---

## Related card. Rankings on the public portal

Not in `uploads/portal-publico.json`. QA lists it as a dependency.

- Notion. [Mostrar rankings y premios por posición en portal público](https://app.notion.com/p/3d77b204009a8143b7f6e3ea2f668a88)
- Acceptance. Portal shows goleadores, asistidores, rating, MVP, and best players by position. Eligibility minima apply. No private data. No provider payloads.
- Notion notes. Backend is ready on `main`. `packages/public-portal` is empty. No public competition routes or UI.

Backend facts to consume, not rewrite:

- `RANKING_KINDS` is `scorer`, `assister`, `rating`, `mvp`, `goalkeeper`
- `RANKING_FORMULA_VERSION` is `player-ranking-v1`
- `DEFAULT_RANKING_ELIGIBILITY` is 3 matches or 0.6 team minutes
- `isEligibleForRanking` and `buildCompetitionRankings` already drop ineligible rows
- Private HTTP `GET .../rankings?kind=` on `apps/api` only. No web BFF. `statistics.read` is staff, not captain or player.
- Operator nav item Rankings is a stub under `/orgs/:orgId/competitions/:competitionId/rankings`

Premios por posición in the card maps to the five player kinds. There is no `Prize` type. Eligibility is the gate. Team 0 to 100 performance ranking (FTR-RNK-001) is Should and not implemented. AC-RNK-001 forbids mixing it with the official table.

Unmatched or ambiguous identity correlation omits players from ranking aggregates. A published score can still yield an empty public ranking.

## Open product decisions

These are not settled in `product/open-decisions.md`.

1. Public URL key. Opaque `competitionId` versus a new slug on `Competition`.
2. Whether `paused` and `finished` remain publicly readable. Glossary says published Competition.
3. Whether `organizationId` and `teamId` may appear in public JSON. FTR-PUB-001 says no internal platform ids.
4. Whether this UI task includes a Rankings tab shell or waits for the rankings card.
5. Cache TTL and whether HTML is cached at the Worker versus JSON only at `apps/api`.
6. Whether FR-14 premios is ranking-kind leaders or a prize config that does not exist.
7. Whether ineligible players stay hidden (current snapshot) or appear as ineligible (DEC-043 wording).
8. Public display-name source. `PlayerProfile` has none. Contribution `displayName` is provider-sourced.
9. Whether every `published` competition is crawlable, or an extra organizer publication flag is required.
