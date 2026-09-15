# Analíticas Premium

Research only. No product code in this change.

**throughput checkpoint:** n/a, read-only investigation.

Epic [Analíticas Premium](https://app.notion.com/p/3dc7b204009a81a69a95f2cb4c10144d). Fase 5, P1, MVP yes. Six child tasks. Notion pages are property rows with empty bodies. Product text lives in `/product/` and in the [master PRD](https://app.notion.com/p/3a07b204009a8139a085d3cbc3223283).

Companion tests: [`analiticas-premium.tests.json`](./analiticas-premium.tests.json).

## Overview

`@futrob/analytics` is an empty public API. Official team and player numbers already live in `@futrob/statistics` and update only after `results.official-result-approved`. The architecture graph draws `analytics → StatisticsReaderPort → statistics`. That port does not exist in code.

Premium is interpretation of those official numbers. It is not a second standings table. It is not EA game-profile charts. It is not a prediction engine (`WONT-06`).

The six tasks split the first premium layer into data, entitlement, gated HTTP, two dashboards, and information architecture. Roles and `EffectiveAccess` are Done. Billing automation is out of MVP. The recommended commercial default is a free operational plan plus a premium-analytics flag (`DEC-050`).

## Key concepts

**Official statistics.** Competitive projections from approved official results. Totals, per-match rates, per-90, standings, rankings. Public or permissioned with `statistics.read` and `statistics.read-own`.

**Premium analytics.** Trends, percentiles, form windows, comparisons, organizer operational KPIs. Owned by `analytics`. Protected by FR-17 and AC-ANA-001.

**EffectiveAccess.** Server-resolved roles and permissions for a scope. UI may hide controls from the allowed set. It must not authorize.

**Plan entitlement.** Commercial flag distinct from RBAC. A member can have `organizations.read` and still lack premium. `Organization` has no plan field today.

**AnalyticsSnapshot.** Glossary name for persisted premium aggregates. Reconstructable from official results. No Postgres table yet.

## How it works today

```text
confirmOfficialSelection
  → OfficialResultApproved
  → ProjectOfficialResultUseCase (same Postgres transaction in apps/api)
  → PlayerMatchContribution / TeamMatchContribution
  → PlayerCompetitionStats / TeamCompetitionStats / standings / rankings
  → (analytics snapshot worker is a stub and is not registered)
```

Reads of official numbers go through `apps/api` use cases, Zod contracts, `@futrob/sdk`, and the web BFF. Personal official stats exist at `GET /players/me/statistics`. The player UI at `/player/statistics` does not call that endpoint. It charts `PlayerGameProfileDto` from EA observations. `design.md` already warns not to label that screen as official.

HTTP failures map in `failureToHttp` / `statusForFailureCode`. Codes that contain `forbidden` become 403. There is no 402 branch.

## Where things live

| Concern | Path |
| --- | --- |
| Empty analytics package | `packages/analytics/src/index.ts` |
| Web reexport | `apps/web/src/modules/analytics/index.ts` |
| Stub snapshot worker | `apps/web/src/workers/analytics-snapshot.worker.ts` |
| Event name only | `FutrobEventNames.analyticsSnapshotGenerated` in `apps/web/src/shared/contracts/events/catalog.ts` |
| Official stats BC | `packages/statistics/` |
| Stats composition | `apps/api/src/di/statistics.module.ts` |
| Confirm then project | `confirmOfficialSelectionAndProject` in `apps/api/src/di/create-modules.ts` |
| Personal and competition HTTP | `apps/api/src/http/routes/players.ts`, `competitions.ts` |
| HTTP status map | `apps/api/src/http/errors.ts` |
| RBAC catalogs | `ALL_PERMISSIONS` in `apps/api/src/adapters/authorization/contextual-role-permissions.ts` |
| EffectiveAccess HTTP | `GET /authorization/effective-access` |
| Nav stub Analíticas | `competitionNav` in `apps/web/src/shared/presentation/shell/nav-registry.ts` |
| Stat primitive | `packages/ui/src/components/stat.tsx` |
| Design contract | `design.md` (Grafito + Lima, Stat Inicio vs Mis estadísticas) |

Composition for product use cases is `apps/api/src/di/`. ADR-0002 still mentions `apps/web/src/di/`. ADR-0013 removed that chain. New analytics adapters belong in `apps/api`.

## Gotchas

1. **Form exists twice.** PRD §12 lists forma reciente on public team stats. Premium §14 lists form of the last 5, 10, or 20 official matches. `CompetitionStandingRow` has no form string. The player UI already draws last-five EA outcomes in `PlayerProfileFormChart`. Premium form must be official, windowed, and not that EA chart.
2. **`FTR-ANA-001` is Should.** The Notion epic and children are MVP yes. The included-MVP list in `prd.md` also names the first premium layer. Treat the Notion children as in-scope. Do not grow into predictions or paid checkout.
3. **Organizer health vs superuser health.** `GetProviderHealthUseCase` exists. `GET /internal/game-data/providers/:providerKey/health` requires `authorization.superusers.manage`. Organizer KPIs cannot reuse that route as-is.
4. **Disputes are a status, not a BC.** `SelectionStatus` includes `disputed`. There is no `MatchDispute` entity or list use case. Organizer dispute KPIs have no query to read.
5. **Reschedule create exists. Org counts do not.** `CreateScheduleChangeRequestUseCase` persists requests. There is no competition-level count of open reschedules for an organizer panel.
6. **Contributions have no kickoff.** `PlayerMatchContribution` and `TeamMatchContribution` omit `scheduledStartAt`. Form and jornada trends need `Encounter.scheduledStartAt` and `roundId` through a reader port. Do not copy scheduling tables into analytics adapters.

## Recommended shape (not implemented here)

Hexagon from `.cursor/skills/futrob-hexagonal-module/SKILL.md`.

```text
packages/analytics/src/
  domain/entities/analytics-snapshot.ts
  domain/policies/analytics-permissions.ts   # analytics.read
  domain/ports/statistics-reader.port.ts
  domain/ports/organizer-ops-reader.port.ts
  domain/errors/analytics.errors.ts
  application/rebuild-analytics-snapshot/
  application/get-team-analytics/
  application/get-player-analytics/
  application/get-organizer-analytics/
```

Entitlement is not an analytics table. Keep a flag or plan on the organization (or a platform grant), resolve it on the server, and map `analytics.entitlement_required` to HTTP 402. Keep missing RBAC as 403. Do not put Stripe, Better Auth, or React in `@futrob/analytics`.

---

## Task 1. [Data] Agregados tendencias / percentiles / forma

**Notion.** [3dc7b204009a810281f6fa0b2ae0f828](https://app.notion.com/p/3dc7b204009a810281f6fa0b2ae0f828). Data, P1. Deps: official team and player stats Done.

**Criterios.** Agregados de tendencias, percentiles y forma para equipo y jugador a partir de oficiales. Sin predicciones.

### Context

Measured. `ProjectOfficialResultUseCase` writes contributions and rollups after approval. `GetCompetitionTeamStatisticsUseCase` and `GetMyPersonalStatisticsUseCase` return current totals, not windows, not percentiles, not form sequences.

`TeamMatchContribution.side` is `home | away`. Goals for and against support W/D/L. `PlayerMatchContribution.position` supports positional percentiles once a cohort exists.

`DEC-044` keeps public surfaces as table, results, and essential rankings. Percentiles, evolución, comparativas, and organizer analytics are premium.

### Paths and symbols

- `ProjectOfficialResultUseCase`, `RebuildCompetitionStatisticsUseCase`
- `PlayerMatchContribution`, `TeamMatchContribution`, `TeamMatchSide`
- `PlayerCompetitionStats`, `TeamCompetitionStats`, `PlayerPersonalStats`
- `PLAYER_STATISTIC_METRICS` in `packages/statistics/src/domain/entities/player-aggregate-stats.ts`
- `statistics.competition-stats-rebuilt`, `analytics.snapshot-generated`
- `handleAnalyticsSnapshotJob` (throws `analytics-snapshot.worker: not implemented`)
- Missing: `StatisticsReaderPort` (named only in `docs/architecture/dependency-graph.md`)

### Gaps

- Empty `@futrob/analytics` (`export {}`).
- No domain types for trend series, percentile rank, or form window (5, 10, 20).
- No snapshot table. Conceptual name `analytics_snapshots` in `product/mvp-requirements.md`.
- Worker not wired in `registerWorkers` (only game-data sync is).
- No formula version for analytics distinct from `COMPETITION_STANDING_FORMULA_VERSION` and `RANKING_FORMULA_VERSION`.
- Unattributed contributions (`correlationStatus !== "matched"`) must not enter percentiles. Statistics already leaves them unmatched. Analytics must keep that rule.

### Behavior tests

See `ANA-DATA-*` in the sibling JSON. Domain tests with fake contribution lists. Replay of the same official revision must not duplicate a snapshot. Unofficial ProviderMatch rows must not appear.

### Notas

Official stats are the input. Analytics must not write `team_competition_stats` or standings. Rebuild from stored official contributions. Do not call EA.

---

## Task 2. [Auth] Gate de plan / entitlement premium

**Notion.** [3dc7b204009a81de8375d43de9ca0bca](https://app.notion.com/p/3dc7b204009a81de8375d43de9ca0bca). Backend, P1. Deps: Exponer roles, grants y permisos efectivos Done.

**Criterios.** Entitlement de plan premium se resuelve en servidor. UI solo refleja EffectiveAccess and plan. Sin bypass en cliente.

### Context

Measured. `GetEffectiveAccessUseCase` delegates to `AuthorizationPort.getEffectiveAccess`. HTTP `GET /authorization/effective-access` returns `EffectiveAccessDto`. Web `useCan` / `useCapabilities` read that set and fail closed on loading or error.

Permission catalogs are per BC. `ALL_PERMISSIONS` unions organization, competition, team, encounter, result, and statistics. Analytics is absent. `Organization` is `id`, `name`, `normalizedName`, `createdAt`, `createdByActorId`. No plan.

`DEC-050` and `WONT-05` forbid automated payments in MVP. FR-17 still requires protection by subscription or permission. The gate is a server flag plus RBAC, not a payment provider.

### Paths and symbols

- `AuthorizationPort`, `EffectiveAccess`, `EffectivePermission`
- `GetEffectiveAccessUseCase`
- `ORGANIZATION_PERMISSION`, `STATISTICS_PERMISSION`
- `contextual-authorization.adapter.ts`, `ALL_PERMISSIONS`
- `can`, `useCan`, `useEffectivePermissions`
- `SHELL_PERMISSIONS` in `apps/web/src/context/permissions.ts` (no analytics constant)
- `RequirePermissionUseCase` / `requireApiPermission`

### Gaps

- No `ANALYTICS_PERMISSION.read` (suggested `analytics.read`).
- No entitlement type (`plan: "free" | "premium"` or `premiumAnalyticsEnabled`).
- `EffectiveAccessDto` has no `plan` field. Criterion asks the UI to reflect plan. Either extend the DTO or add a sibling org-plan read. Do not let the client send plan as authority.
- Hiding a nav item is not the gate. `competitionNav` already stubs Analíticas behind `COMPETITION_PERMISSION.read`. That is the wrong permission and would show the link to any competition reader.

### Behavior tests

See `ANA-AUTH-*`. Server denies without entitlement even if the client forges a plan. Grant allow of `analytics.read` without the org flag still 402. Spectator without competition membership 403. EffectiveAccess after flag flip matches the next GET.

### Notas

Keep entitlement out of the `@futrob/analytics` domain if it is an organization or platform fact. Inject an `EntitlementPort` or read it from organizations. The UI may show a locked `EmptyState`. The API remains the barrier.

---

## Task 3. [API] Endpoints gated premium (equipo, jugador, org)

**Notion.** [3dc7b204009a81c0a4adf8c1b53e9c55](https://app.notion.com/p/3dc7b204009a81c0a4adf8c1b53e9c55). Backend, P1. Deps: data aggregates and auth gate.

**Criterios.** Endpoints premium gated para equipo, jugador y organizador. Typed 402 and 403 without entitlement.

### Context

Measured. Product HTTP lives in `apps/api/src/http/routes/*`. Web BFF proxies with session then service auth. SDK resources mirror contracts. There is no analytics resource, no OpenAPI path, no CLI command.

Pattern to copy: `registerCompetitionRoutes` standings and rankings, `registerPlayerRoutes` `/players/me/statistics`, `failureToHttp`. Use cases decide. Routes parse Zod and translate `TaggedError`.

Suggested paths (inferred, not in code):

- `GET /organizations/:organizationId/competitions/:competitionId/analytics/teams/:teamId`
- `GET /players/me/analytics` (own official premium only)
- `GET /organizations/:organizationId/competitions/:competitionId/analytics/organizer`

Do not overload `GET /players/me/statistics`. The Done stats API task already says premium must consume `@futrob/analytics`.

### Paths and symbols

- `apps/api/src/app.ts` route registration
- `failureToHttp`, `statusForFailureCode` (no 402)
- `packages/api-contracts/src/v1/statistics/schemas.ts` as the non-premium contract
- `packages/sdk/src/resources/statistics.ts`
- `apps/web/src/routes/api/v1/players/me/statistics.ts` BFF
- `npm run cli -- statistics-smoke`, `standings`

### Gaps

- `statusForFailureCode` never returns 402. A code such as `analytics.entitlement_required` would be 500 today.
- Two-org isolation tests exist for authorization grants. None for analytics.
- No SDK method. Mobile cannot call a missing resource. FTR-MOB-003 will require the same SDK later. Out of this epic's UI tasks, still design the contract once.
- Organizer endpoint must not return other-org competition ids, provider payloads, or dispute free text.

### Behavior tests

See `ANA-API-*`. HTTP 401 without service or session auth. 403 other-org and spectators. 402 free plan with membership. 200 premium returns only official-derived fields. Replay GET is read-only. Invalid query 400 `api.validation_error`.

### Notas

Use `TaggedError` codes `analytics.read_forbidden` (403) and `analytics.entitlement_required` (402). Do not leak existence of another tenant's snapshot in 404 vs 403. Follow AC-SEC-001.

---

## Task 4. [UI] Dashboards premium equipo/jugador

**Notion.** [3dc7b204009a81f89f4bcbd8b624595c](https://app.notion.com/p/3dc7b204009a81f89f4bcbd8b624595c). Frontend, P1. Deps: gated API; [Diseñar analíticas premium de equipo y jugador](https://app.notion.com/p/3a07b204009a8185a4c2d54d2c0a8b8f) (Not started).

**Criterios.** Dashboards premium de equipo y jugador: tendencias, percentiles, forma, comparaciones. Sin predicciones.

### Context

Measured. Competition shell lists Analíticas as `stub: true` at `{org}/competitions/{id}/analytics`. No route file. Competition home is a placeholder. Player `/player/statistics` is EA KPIs plus evolution and form charts (`PlayerProfileKpis`, `PlayerProfileEvolutionChart`, `PlayerProfileFormChart`).

`useMyStatisticsQuery` is defined and unused. Official personal stats are wired in BFF and SDK, not in that page.

Design contract: reuse Stat compositions in `design.md` (Inicio lima island vs perfil icon stack). Do not invent a third Stat island. Grafito + Lima. Spanish default copy via Paraglide. 44 px targets.

### Paths and symbols

- `apps/web/src/shared/presentation/shell/nav-registry.ts` (`id: "analytics"`)
- `apps/web/src/modules/statistics/presentation/player-profile/*`
- `Stat`, `StatGroup`, `EmptyState`
- `queryKeys` (no analytics key)
- `packages/ui/src/stories/stat.stories.tsx`

### Gaps

- No `apps/web/src/modules/analytics/presentation/`.
- Design task for team and player premium is Not started. Visual layout is not specified beyond PRD §14 and Stat rules.
- Risk of extending `/player/statistics` with EA charts and calling it premium. That would violate official-only and the statistics vs analytics split.
- Nav uses `COMPETITION_PERMISSION.read`. Must switch to `analytics.read` and fail closed without entitlement.
- No i18n keys for 402.

### Behavior tests

See `ANA-UI-PLAYER-*`. Gated empty state without entitlement. Dashboard after 200 shows official trends only. EA recent matches do not appear. Reduced motion respected if charts animate. Locale `es` and `en`. Deep link preserves competition and team.

### Notas

Player premium can live next to official stats, not on the EA profile. Team premium belongs under the competition shell, not the public portal.

---

## Task 5. [UI] Panel KPIs premium del organizador

**Notion.** [3dc7b204009a816993a1d7eee296932c](https://app.notion.com/p/3dc7b204009a816993a1d7eee296932c). Frontend, P1. Deps: gated API; [Diseñar analíticas premium del organizador](https://app.notion.com/p/3a07b204009a8198ad48f1f9b0641b16) (Not started).

**Criterios.** Panel organizador: cumplimiento calendario, disputas, reprogramaciones, calidad de datos y salud del proveedor.

### Context

Measured. Org home (`/_app/orgs/$orgId/`) is a provisional title. No KPI strip. `GetProviderHealthUseCase` and `ProviderHealthSnapshot` exist for platform operators. Calendar data lives in `Encounter` and fixtures. Reschedule requests can be created. Disputes are a selection status.

PRD §14 organizer list also includes completed vs pending matches, confirmation time, auto-approved results, competitive balance, and participation. The Notion criterion is the smaller first layer: calendar, disputes, reschedules, data quality, provider health.

### Paths and symbols

- `apps/web/src/routes/_app/orgs/$orgId/index.tsx`
- `GetProviderHealthUseCase`, `ProviderHealthSnapshot`
- `CreateScheduleChangeRequestUseCase`, `ScheduleChangeRequestStatus`
- `SelectionStatus` (`disputed`, `organizer_review`, `awaiting_opponent_confirmation`)
- `TeamCompetitionStats.partial` for data quality
- `ORGANIZATION_PERMISSION.read` vs future `analytics.read`

### Gaps

- No organizer analytics use case or DTO.
- No list or count of disputed encounters.
- No aggregate of schedule-change requests by competition.
- Provider health HTTP is superuser-only. Organizer panel needs a sanitized, competition-scoped health summary, not the internal probe.
- `FTR-HEALTH-001` is Should. The Notion organizer panel still asks for provider health. Keep the snapshot coarse (healthy, degraded, unavailable) and strip request ids.
- Design org task is Not started.

### Behavior tests

See `ANA-UI-ORG-*`. Organizer with entitlement sees KPI counts that match official and scheduling reads. Staff without entitlement sees 402 empty state. Member without `analytics.read` 403. Counts ignore other organizations. Provider health never shows raw EA bodies.

### Notas

Analytics interprets operational ports. It must not own fixture tables or health event writes. Bridge reader ports in `apps/api` adapters.

---

## Task 6. [UX] IA de la primera capa premium (sin predicciones)

**Notion.** [3dc7b204009a814b84edfd831adc1004](https://app.notion.com/p/3dc7b204009a814b84edfd831adc1004). UX, P1. Deps: both Diseñar analíticas premium tasks (Not started).

**Criterios.** IA and wireframes of the first premium layer (equipo, jugador, org) without predictions. Ready for UI.

### Context

Measured. No wireframe, Storybook, or Figma for premium analytics in this repo. `design.md` specifies Stat, empty states, and the Mis estadísticas reading order. That page is personal EA performance, not this epic.

PRD §14 is the content inventory. DEC-044 draws the public vs premium line. WONT-06 bans AI predictions. "Fortalezas y áreas de mejora sustentadas por datos" in §14 can look like advice. First layer should stay descriptive (percentile, trend, comparison), not a forecast.

### Paths and symbols

- `design.md` sections Stat, Mis estadísticas, empty states
- `packages/ui/src/components/stat.tsx`, `empty-state.tsx`
- `features/` map (no analytics feature file)
- Nav stub vs missing routes

### Gaps

- Design dependencies are Not started. This UX task cannot close from code alone.
- No sitemap for `/orgs/:id/analytics`, `/orgs/:id/competitions/:id/analytics`, `/player/analytics`.
- No copy for locked premium (`EmptyState` + CTA) in `es` and `en`.
- Mobile IA is unspecified. FTR-MOB-004 will need the same EffectiveAccess later. Do not block web on native screens. Do name shared routes and DTOs.

### Behavior tests

See `ANA-UX-*`. These are document checks, not Vitest, until UI lands. Inventory of surfaces, states (loading, empty official data, partial, forbidden, entitlement missing, ready), and a list of metrics that are explicitly not predictions.

### Notas

Ship the IA as product notes or `design.md` sections before the two UI tasks. Do not treat the current EA form chart as the premium wireframe.

---

## Dependency order

1. Auth entitlement plus `analytics.read`. Can land before data if endpoints return 402 or 403 with an empty body.
2. Data snapshots from official contributions.
3. Gated HTTP + contracts + SDK.
4. UX IA (blocked on design tasks in Notion; can draft from PRD §14 now).
5. Player and team dashboards.
6. Organizer KPI panel.

Stats oficiales Done is a real code dependency. Roles Done is a real code dependency. Design tasks are not in this epic and are still Not started.

## Sources

- Notion task properties fetched 2026-09-15. Page bodies empty.
- `/product/prd.md`, `mvp-requirements.md`, `acceptance-criteria.md` AC-ANA-001, `open-decisions.md` DEC-044 and DEC-050, `domain-glossary.md` AnalyticsSnapshot.
- `/docs/architecture/overview.md`, `module-boundaries.md`, `dependency-graph.md`, ADR-0011, ADR-0013.
- Code paths listed per task. Measured unless marked inferred.
