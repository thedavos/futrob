# Clasificación y rendimiento

Research only. No product code in this change.

**Question.** What exists today for standings by stage, mixed match rules, and team performance ranking, and what each Fase 5 task still needs.

**Playbook.** Investigation plus hexagonal placement. Throughput checkpoint is n/a because this is read-only.

**Sources.** Git `main` at `de3c657`. [PR 36](https://github.com/thedavos/futrob/pull/36) and its review notes. Notion epic [Clasificación y rendimiento](https://app.notion.com/p/3dc7b204009a81fb971fcc20c4c2b93c). Parent story [Clasificación por stage en competiciones mixtas](https://app.notion.com/p/3bb7b204009a81dbaa02c09167596378). Ranking story [Crear ranking de equipos por rendimiento](https://app.notion.com/p/3a07b204009a8155aa9ec6fe35a9caf1). Product files under `/product`.

Claims below are **measured** from those files unless marked **inferred** or **guess**.

## Overview

Standings already exist as one official table per competition. Projection applies a single `resolutionMode` to every `TeamMatchContribution`. Mixed formats already store two rule sets on `CompetitionRules` and two modes on `FixturePlan`. The encounter read model that statistics actually uses does not carry stage, so the table cannot tell a regular slot from a knockout aggregate.

Player rankings exist (`scorer`, `assister`, `rating`, `mvp`, `goalkeeper`). Team performance ranking (0 to 100, FTR-RNK-001) does not. The web Clasificación and Rankings nav items are stubs on the operator competition shell. Players never see those stubs. GET standings still requires `STATISTICS_PERMISSION.read`.

## Key concepts

**EncounterScheduleSnapshot.** Scheduling read model consumed by results and statistics. Fields today are the ids, the two teams, the start time, and `officialMatchCount`. No stage.

**CompetitionMatchRules.** Per-stage rules on `CompetitionRules.regularStage` and `knockoutStage`. Includes `resolutionMode`, slot count, and points.

**StandingResolutionMode.** `independent_matches` counts each official slot as `played += 1`. `aggregate_score` sums goals per `encounterId` plus `teamId` and counts that as one table match.

**CompetitionsMatchRulesReader.** API adapter. `getPointsRules(competitionId)` returns `regularStage ?? knockoutStage`. One mode per competition.

**Performance ranking.** Glossary term. Score 0 to 100, distinct from the official table. Not the player `RankingSnapshot` kinds.

## How it works today

```text
competitions.rules.regularStage / knockoutStage
        |
        v
CompetitionFixtureSourceAdapter
  officialMatchCounts + resolutionModes
        |
        v
generateFixturePlan
  league|groups  -> resolutionModes.regular
  knockout|playoffs -> resolutionModes.knockout
  FixtureEncounter.stageId + series.resolutionMode
        |
        v
projectFixtureEncounter
  EncounterScheduleSnapshot  (stage dropped)
        |
        v
results.official-result-approved
        |
        v
ProjectOfficialResultUseCase
  TeamMatchContribution (no stage, no mode)
  matchRules.getPointsRules(competitionId)
  buildCompetitionStandings(one pointsRules)
        |
        v
GET .../standings  (one snapshot)
GET .../rankings    (player kinds only)
```

**Measured.** `create-competition-draft` already presets mixed rules. `league` gets only `regularStage` with `independent_matches`. `knockout` gets only `knockoutStage` with `aggregate_score`. `league-playoffs` and `groups-knockout` get both. Fixture generation keeps those two modes. Statistics then collapses them with `??`.

**PR 36.** Owner notes that aggregate two-leg encounters count as one table match, independent slots still count each slot, and mixed-format competitions stay out of that PR. Pullfrog had flagged wrong `played` for `aggregate_score`, then the grouping fix, then the remaining mixed-format issue as deferred.

## Where things live

| Area | Path |
| --- | --- |
| Draft rules preset | `packages/competitions/src/application/create-competition-draft/create-competition-draft.use-case.ts` (`rulesPreset`) |
| Rules VO | `packages/competitions/src/domain/value-objects/resolution-mode.ts` |
| Fixture plan + series | `packages/scheduling/src/domain/entities/fixture-plan.ts` |
| Fixture generation | `packages/scheduling/src/domain/policies/generate-fixture-plan.ts` |
| Snapshot projection | `packages/scheduling/src/application/project-fixture-encounters.ts` |
| Encounter snapshot | `packages/scheduling/src/domain/entities/encounter-schedule-snapshot.ts` |
| Results copy of snapshot | `packages/results/src/domain/ports/encounter-reader.port.ts` |
| Snapshot DTO | `packages/api-contracts/src/v1/encounters/schemas.ts` |
| Postgres snapshot | `apps/api/migrations/0018_encounter_schedule_snapshots.sql` |
| Rules reader port | `packages/statistics/src/domain/ports/competition-match-rules-reader.port.ts` |
| Rules reader adapter | `apps/api/src/adapters/statistics/competition-match-rules-reader.ts` |
| Standings policy | `packages/statistics/src/domain/policies/build-competition-standings.ts` |
| Team contribution | `packages/statistics/src/domain/entities/team-match-contribution.ts` |
| Project + rebuild | `packages/statistics/src/application/project-official-result/project-official-result.use-case.ts` |
| HTTP standings | `apps/api/src/http/routes/competitions.ts` |
| Player rankings | `packages/statistics/src/domain/policies/build-competition-rankings.ts` |
| Web nav stubs | `apps/web/src/shared/presentation/shell/nav-registry.ts` |
| Per-encounter series row | `encounter_series.resolution_mode` in `apps/api/migrations/0025_competition_fixtures.sql` |
| Created event (stage present) | `packages/scheduling/src/domain/events/encounter-created.event.ts` |
| Setup per-stage editor | `MatchRulesEditor` in `apps/web/src/modules/competitions/presentation/competition-setup-steps.tsx` |
| Design | `design.md` UX-RNK-002, UX-SCP-003 |
| Unrelated 0-100 weights | `packages/game-data/src/domain/policies/player-attribute-overview.ts` (`WEIGHTS`) |

## Gotchas

1. **Two snapshots named "encounter".** Scheduling `EncounterScheduleSnapshot` is the live schedule. Results `OfficialResult.slots` is an immutable result snapshot. The Notion task means the schedule snapshot that projection reads, not `OfficialResultSlotSnapshot`.
2. **Stage lives on the fixture, not on the schedule row.** `FixtureEncounter.stageId` and `FixtureSeries.resolutionMode` already exist. `projectFixtureEncounter` does not copy them.
3. **Placeholder knockout rows have `series: null`.** Until both sides are concrete teams, there is no series. Stage still exists on those rows.
4. **`regularStage ?? knockoutStage` is correct for a pure cup and wrong for league-playoffs.** A mixed competition always has `regularStage`, so knockout rules never reach standings.
5. **Player `/rankings` is not team performance ranking.** Wire `formulaVersion` is `player-ranking-v1`. Do not add a team score as another `RankingKind`.
6. **FTR-RNK-001 is Should in `product/mvp-requirements.md`.** Notion marks the ranking tasks MVP YES. Product precedence is user request, then PRD. Treat ranking as in-scope for this epic unless product drops it.
7. **DEC-014 tie-breakers are richer than the table.** Current sort is points, then goal difference, then goals for, then `teamId`. Head-to-head and sanctions are not in `compareStandings`. Out of this epic unless mixed-table work touches the sort.
8. **Two `EncounterScheduleSnapshot` types.** Scheduling and results each declare the type. Adding stage means changing both. They are not a shared import.
9. **`scheduling.encounter-created` already has `stageId` and `roundId`.** No consumer copies those onto the schedule snapshot.
10. **`encounter_series` already stores per-encounter `resolution_mode`.** Statistics must not query that table. Copy the mode onto `TeamMatchContribution` at projection time.
11. **There is no `competition_stages` table.** Stage instances live on `fixture_stages`. Architecture text that competitions owns stages is ahead of the schema.
12. **Nav versus API permission.** Operator competition nav (including Clasificación) is selected when `competitions.update` is allowed. The item itself lists `competitions.read`. GET standings authorizes `statistics.read` inside the use case and does not use `requireApiPermission`. A captain with `competitions.read` never sees the stub and may still get 403 on the GET.
13. **`competitionMark` treats `league-playoffs` as a league mark.** `groups-knockout` is a cup mark. That is a badge, not a table, but a mixed UI must not inherit it as "this is a pure league."
14. **Do not reuse game-data `WEIGHTS`.** Those numbers score EA game-profile attributes, not DEC-041 team ranking.

## Hexagonal placement

Keep this split when the tasks are implemented later.

- **scheduling** owns stage on `EncounterScheduleSnapshot` and copies it from `FixtureEncounter`.
- **competitions** already owns `regularStage` and `knockoutStage`. Do not invent a third rules object in statistics.
- **results** widens `EncounterReaderPort` to pass stage through. It does not compute standings.
- **statistics** maps stage to `StandingResolutionMode` at projection time, stores that mode on `TeamMatchContribution`, and lets `buildCompetitionStandings` mix modes in one table. It does not import `FixturePlan`.
- **analytics** stays empty. Team performance ranking is a competitive projection, so it belongs in statistics (see `/docs/architecture/module-boundaries.md`).
- **apps/api** keeps `CompetitionsMatchRulesReader` as the bridge. Change the port so it can answer by encounter or by stage, not only `competitionId`.
- **presentation** consumes DTOs. It does not re-count slots.

**Inferred mapping.** `FixtureStage.kind` `league` or `groups` uses `regularStage`. `knockout` or `playoffs` uses `knockoutStage`. Persist a coarse `stageKind` (`regular` or `knockout`) on the schedule snapshot if statistics must not depend on fixture UUIDs. Keep `stageId` if the UI later filters by fixture stage.

## Tasks

### 1. [Domain] Stage en snapshot del encounter

**Notion.** [Stage en snapshot del encounter](https://app.notion.com/p/3dc7b204009a81d28a04e1f885f91c50)

**Acceptance.** The encounter snapshot includes stage. Standings projections can tell regular from knockout.

#### Context

`FixtureEncounter` already has `stageId`. `EncounterCreatedEvent` already has `stageId`. The consumer snapshot used by `SchedulingEncounterReader` and `buildTeamContributions` does not. Projection maps clubs to `homeTeamId` and `awayTeamId` from that snapshot and then forgets where the encounter sat in the fixture.

#### Paths and symbols

- `EncounterScheduleSnapshot` in `packages/scheduling/src/domain/entities/encounter-schedule-snapshot.ts`
- Duplicate `EncounterScheduleSnapshot` in `packages/results/src/domain/ports/encounter-reader.port.ts`
- `projectFixtureEncounter` in `packages/scheduling/src/application/project-fixture-encounters.ts`
- `UpsertEncounterScheduleSnapshotUseCase` and `upsertEncounterScheduleSnapshotRequestSchema`
- `encounter_schedule_snapshots` in `apps/api/migrations/0018_encounter_schedule_snapshots.sql`
- `PostgresEncounterScheduleRepository` select list
- `buildTeamContributions` in `packages/statistics/src/application/project-official-result/project-official-result-projection.ts`

#### Gaps

- No `stageId` or `stageKind` on `EncounterScheduleSnapshot`.
- No column on `encounter_schedule_snapshots`.
- `TeamMatchContribution` has `encounterId` and `officialSlot` only.
- `OfficialResult` has no stage field. That is acceptable if the schedule snapshot carries stage at projection time.
- No `stageId` or `stageKind` on `EncounterScheduleSnapshot`.
- No column on `encounter_schedule_snapshots`.
- `TeamMatchContribution` has `encounterId` and `officialSlot` only.
- `OfficialResult` has no stage field. That is acceptable if the schedule snapshot carries stage at projection time.
- Manual upsert via HTTP can create encounters outside a fixture. Those rows need an explicit stage or a documented default.
- `scheduling.encounter-created` already carries `stageId`. Wiring that event is not a substitute for the snapshot field. Projection reads the snapshot, not the outbox.
- The leftover `Encounter` entity in `packages/scheduling/src/domain/entities/encounter.ts` is unused in production. Only CLI `domain-smoke` builds it. Do not add stage there and call the task done.
- `EditFixtureEncounterUseCase` can assign concrete teams to a placeholder without creating `series`. Official slots may then come from `officialMatchCount` alone. Stage must still land on the snapshot in that path.

#### Behavior tests

1. Generate a `league-playoffs` plan. Project a regular encounter. `EncounterScheduleSnapshot.stageKind` is `regular` (or the fixture `stageId` of the league stage). Assert the literal stage id from the plan, not `toBeDefined()`.
2. Project a concrete playoff encounter after both sides are teams. Snapshot stage matches the playoffs stage, not the league stage.
3. `SchedulingEncounterReader.getById` returns the same stage field results and statistics see.
4. Rebuild of an older official result still sees stage. If stage is only on the live fixture row, a superseded plan must not silently retag history. **Inferred.** Copy stage onto `TeamMatchContribution` in the next task, or freeze it on the result. This task at least makes the live snapshot carry it.

#### Notas

Depends on official team stats (PR 36, done). Do not put `FixtureStageId` into `@futrob/statistics`. Copy a scheduling-owned field, then map to `regular` or `knockout` at the statistics boundary. Widen both snapshot types in the same change. The results port is a duplicate, not a re-export.

---

### 2. [Domain] Resolver reglas de marcador por encounter

**Notion.** [Resolver reglas de marcador por encounter](https://app.notion.com/p/3dc7b204009a812ea3b0f0a4cdfbb398)

**Acceptance.** Score rules resolve per encounter or stage, not only `competitionId`. `league-playoffs` mixes modes in the same table.

#### Context

This is the PR 36 follow-up. `buildCompetitionStandings` already implements both modes. The switch is competition-wide. `CompetitionsMatchRulesReader.getPointsRules` is the collapse.

The parent story (Notion, 2026-08-13) says to apply `independent_matches` to regular encounters and `aggregate_score` to knockout or playoff encounters. A 1-0 then 0-2 semifinal is one played match and the aggregate score, not two table rows. Pure league and pure cup stay as they are.

#### Paths and symbols

- `CompetitionsMatchRulesReader` in `apps/api/src/adapters/statistics/competition-match-rules-reader.ts`
- `CompetitionMatchRulesReaderPort.getPointsRules`
- `buildCompetitionStandings` / `matchesForStandings` / `aggregateEncounterMatches`
- `ProjectOfficialResultUseCase.rebuildStandings`
- `RebuildCompetitionStatisticsUseCase` (same `getPointsRules(competitionId)` call)
- `DEFAULT_COMPETITION_MATCH_POINTS` (falls back to independent)

#### Gaps

- Port takes only `competitionId`.
- Policy takes one `pointsRules` for the whole contribution list.
- Contributions do not store `resolutionMode`.
- No test feeds regular independent slots and knockout aggregate slots into one `buildCompetitionStandings` call.
- Points (`winPoints` and so on) can differ per stage in the VO. Mixed table must pick per encounter, not average them. Today the reader also collapses points, not only mode.
- `officialMatchesPerEncounter` is unused by standings. Mode decides grouping, not slot count.
- `ProjectOfficialResultUseCase` tests never pass `aggregate_score` into `getPointsRules`. The policy test is the only aggregate coverage, and it is not mixed.
- No unit test for `CompetitionsMatchRulesReader`.
- Standings read live `findRulesByCompetitionId`, not `rulesVersion` on the fixture plan. A later rule edit would retag history unless the mode is frozen on the contribution.

#### Behavior tests

Subject is `buildCompetitionStandings` with fake contributions. No mocks of the policy.

1. **Pure league, unchanged.** Two independent slots 1-0 and 0-2 for the same pair. Home `played` is 2, `points` is 3. Literal match of current test in `build-competition-standings.test.ts`.
2. **Pure cup, unchanged.** Same slots under `aggregate_score`. Away `played` is 1, `goalsFor` 2, `goalsAgainst` 1, `points` 3. Home `played` is 1, `points` 0. Same literals as the existing aggregate test.
3. **Mixed league-playoffs.** Regular encounter A, independent, home 1-0. Knockout encounter B, two slots 1-0 and 0-2 (home loses 1-2 on aggregate). After mix, home `played` is 2 (one league match plus one aggregate), `wins` 1, `losses` 1, `points` 3, `goalsFor` 2, `goalsAgainst` 2. Away is the mirror. Do not expect `played` 3.
4. **Same competitionId, opposite stages.** If the reader still returns only `regularStage`, test 3 fails. That is the gate for this task.
5. **Void latest revision.** Mixed table rebuilds from remaining approved contributions only. `played` drops the voided encounter, not one of its slots when that encounter was aggregate.

#### Notas

Sale del review de PR 36. Store `resolutionMode` on `TeamMatchContribution` when projecting, then `buildCompetitionStandings` groups by that field. Do not join `encounter_series` from statistics. Re-querying competitions on every rebuild would couple statistics to live rule edits. **Inferred.** A rules version change should rebuild via the existing rebuild use case, not mutate old contribution modes in place. `TeamCompetitionStats.matchesPlayed` stays slot-counted. Keep that split or cups will look like two matches in team stats and one in the table.

---

### 3. [API] Standings mixtos + ranking de equipos

**Notion.** [Standings mixtos + ranking de equipos](https://app.notion.com/p/3dc7b204009a8142a751f21cb9af867c)

**Acceptance.** API exposes mixed standings and team performance ranking. Zod and OpenAPI. Official data only.

#### Context

`GET /organizations/{organizationId}/competitions/{competitionId}/standings` already returns `CompetitionStandingSnapshot` (`formulaVersion` `points-gd-gf-v1`). Mixed computation can keep that path if task 2 writes a mixed snapshot. `GET .../rankings` returns player `RankingSnapshot[]` with `kind` in `scorer | assister | rating | mvp | goalkeeper`. There is no team score resource.

`GetCompetitionStandingsUseCase` is a permissioned read of the stored snapshot. It does not recompute.

#### Paths and symbols

- `getCompetitionStandingsResponseSchema` in `packages/api-contracts/src/v1/statistics/schemas.ts`
- `getCompetitionRankingsResponseSchema` / `rankingKindSchema`
- Routes in `apps/api/src/http/routes/competitions.ts`
- SDK `client.statistics.getCompetitionStandings` and `getCompetitionRankings`
- CLI `standings` in `apps/cli/src/commands/competitions.ts`
- `STATISTICS_PERMISSION.read`

#### Gaps

- Standings DTO has no `stage`, no `resolutionMode`, no per-row provenance. A mixed table can ship without those fields if PJ is already mixed, but the UI task needs a way to avoid lying about what `played` means. **Guess.** Add optional `notes` or per-row `playedIndependent` and `playedAggregate` only if the UI cannot label the table from competition format alone.
- No team performance DTO, repository, or formula version.
- `packages/analytics` public API is empty (`export {}`).
- Public portal package is empty. FR-16 still wants a public table later. Out of this task unless the contract is reused.
- No HTTP test for GET `/standings`. SDK test only checks the URL and `{ standings: null }`.
- Snapshot rows carry `teamId` only. A UI or CLI that wants names must join the teams list.
- `GET .../rankings` OpenAPI title is player ranking snapshots. It cannot grow a team 0-100 row without a new schema.

#### Behavior tests

1. **HTTP standings, mixed.** After official approval of the mixed fixture in task 2, `GET .../standings` with `STATISTICS_PERMISSION.read` returns home `played` 2 and `points` 3. Actor without read gets 403.
2. **Pure league HTTP.** Same as today. A 1-0 result yields `played` 1 and `points` 3.
3. **Team ranking HTTP.** New contract. One team with a documented v1 score. Response `formulaVersion` is not `player-ranking-v1`. Body `kind` is not a player kind. Score is a number in 0 to 100 inclusive.
4. **Official only.** A synced `ProviderMatch` that is not an approved official result does not change standings or team ranking.
5. **SDK parse.** `@futrob/sdk` parses the new ranking payload. A player rankings response must still parse and must not contain team rows.

#### Notas

Do not extend `rankingKindSchema` with a team kind that reuses `RankingRow.playerProfileId`. That makes illegal states representable. Use a new resource or a distinct snapshot type. AC-RNK-001 is the product check. The official table and the performance ranking coexist without mixing in UI or API. `GET .../team-statistics` is not this ranking.

---

### 4. [UI] Tabla mixta independent_matches / aggregate_score

**Notion.** [Tabla mixta independent_matches / aggregate_score](https://app.notion.com/p/3dc7b204009a8171b147fbe80daf2942)

**Acceptance.** The table UI shows independent matches in regular and aggregate score in knockout without misleading duplicate rows.

#### Context

Nav item `standings` is `stub: true` (`href` `{base}/standings`). There is no `apps/web` route under `orgs/$orgId/competitions/$competitionId/standings`. Web does not call `getCompetitionStandings`. CLI prints `Pos PJ G E P GF GC Pts` from the snapshot as if every row used one mode.

Operator competition nav is used only when `competitions.update` is allowed (`nav-registry.ts`). Players get Resumen, Partidos, Estadísticas, and Mi equipo. `design.md` UX-RNK-002 already requires the performance ranking to stay visually separate from the official table. UX-SCP-003 hides destinations that do not apply (bracket on a pure league). It does not tell you to hide Clasificación on `league-playoffs`.

#### Paths and symbols

- `apps/web/src/shared/presentation/shell/nav-registry.ts` (`id: "standings"`, `id: "rankings"`)
- Competition shell routes under `apps/web/src/routes/_app/orgs/$orgId/competitions/`
- `@futrob/sdk` statistics resource
- `design.md` UX-RNK-002, UX-SCP-003, table density, Grafito plus Lima
- `MatchRulesEditor` (per-stage Independiente versus Marcador agregado)
- `competitionMark` in `apps/web/src/modules/player-home/presentation/player-home-copy.ts`
- CLI printer as a stopgap operator view, not the product UI

#### Gaps

- No competition standings screen, empty state, or permission empty state.
- No mobile screen. `apps/mobile` README lists tabla as a target. No implementation found.
- Nothing to hide "two legs as two PJ" in the UI because the UI does not render PJ yet. The bug to prevent is rendering slot-level rows from `team-statistics` or encounter lists as if they were table rows.
- Standings rows have no team name. The screen must load teams separately.
- `MatchRulesEditor` already edits mixed rules. The table does not consume them.

#### Behavior tests

UI tests call the screen with a fixture snapshot. Assert rendered cells, not CSS class names.

1. Mixed snapshot from task 2. Home row shows PJ 2, not 3. No second body row for the return leg.
2. Pure cup aggregate 1-0 then 0-2. One row, PJ 1, score 1-2 against the home side.
3. Empty snapshot `standings: null`. Recoverable empty copy, not a zeroed table of every participant.
4. Actor without `statistics.read`. Permission empty, no numeric cells.
5. Rankings nav still does not present the official table as a 0-100 list (AC-RNK-001).

#### Notas

Wait for the API task. Do not invent a second table that re-aggregates `TeamCompetitionStats.matchesPlayed`. That aggregate counts slots (`aggregateTeamContributions`), not table matches. Using it as PJ would undo PR 36 for cups. Gate the screen on `statistics.read` even if the nav was shown via `competitions.update`. A 403 must not look like an empty table.

---

### 5. [Data] Pesos iniciales del ranking de equipos

**Notion.** [Pesos iniciales del ranking de equipos](https://app.notion.com/p/3dc7b204009a814880f5ee01d26fd1f0)

**Acceptance.** Initial performance-ranking weights are configurable and documented. Score is reproducible.

#### Context

DEC-041 default is a versioned formula 0 to 100 from results, goal difference, recent form, and offensive or defensive efficiency when those stats exist. The ranking story says define weights before launch. No numbered weights exist in product docs or code.

Player ranking already has `RANKING_FORMULA_VERSION = "player-ranking-v1"` and `DEFAULT_RANKING_ELIGIBILITY` (`minimumMatches` 3, `minimumTeamMinutesRatio` 0.6, DEC-043). That is the pattern to copy. It is not the team formula.

#### Paths and symbols

- `product/open-decisions.md` DEC-041, DEC-043
- `product/domain-glossary.md` Performance ranking
- `product/acceptance-criteria.md` AC-RNK-001
- `product/mvp-requirements.md` FTR-RNK-001 (Should)
- `packages/statistics/src/domain/entities/ranking-snapshot.ts`
- `packages/statistics/src/domain/policies/ranking-eligibility.ts`
- `packages/game-data/src/domain/policies/player-attribute-overview.ts` (do not copy)

#### Gaps

- No `TeamPerformanceRankingSnapshot` entity.
- No weight table in `docs/` or `product/`.
- No version id such as `team-performance-v1`.
- Inputs named by DEC-041 are not specified as functions of official table matches versus slot stats. **Guess.** Use table-level results and GD from mixed standings, not raw slot counts, or cups will double-count legs.
- Eligibility override exists only on `RebuildCompetitionRankingsInput`. Projection always uses 3 matches or 60 percent. That is player eligibility, not team ranking.
- `FTR-RNK-001` is Should. `AC-RNK-001` is written as Must. Notion ranking tasks are MVP YES.

#### Behavior tests

These tests lock the documented table. They fail if someone changes weights without bumping `formulaVersion`.

1. Same official contributions twice. Scores equal to the literal expected map from the v1 table. Replay does not create a second snapshot row per team.
2. Change only `winPoints` on a competition. If results weight uses table points, the score changes. If it uses win rate, it may not. The documented formula must say which. The test asserts the documented choice, not both.
3. Missing defensive stats. Score still in 0 to 100. Absent metrics do not become invented zeros (DEC-040).
4. Export or log of the weight vector equals the documented numbers for `team-performance-v1`. This is a constant-pin only if the test reads the config through the scoring function with one fixture. Prefer `expect(score(fixture)).toBe(72)` over `expect(WEIGHTS.form).toBe(0.2)`.

#### Notas

Product has not numbered the weights. Do not ship invented coefficients in domain code until this Data task lands a table in `product/open-decisions.md` (or a sibling formula doc) and a `formulaVersion`. A strawman that implementers must not treat as decided:

| Input | Role in DEC-041 |
| --- | --- |
| Table results (points or win rate over official table matches) | results |
| Goal difference, normalized | DG |
| Last N official table matches | recent form |
| GF and GA rates from official contributions | efficiency |

**Guess.** Equal weights of 0.25 each would be a placeholder, not a sports model. Leave numbers to product. Do not import `WEIGHTS` from `player-attribute-overview.ts`.

---

### 6. [QA] Fixtures liga / copa / league-playoffs

**Notion.** [Fixtures liga / copa / league-playoffs](https://app.notion.com/p/3dc7b204009a814e84c9d965edfc2de8)

**Acceptance.** Test fixtures cover pure league, pure cup, and league-playoffs. Asserts of PJ and aggregate are correct.

#### Context

Scheduling already generates the three formats. Those tests assert structure (round counts, `stage-rank`, group ids), not standings PJ. Statistics tests assert each mode in isolation with one encounter. CLI `e2e-golden-path` stops at fixture generation.

#### Paths and symbols

- `packages/scheduling/src/domain/policies/generate-fixture-plan.test.ts`
- `packages/competitions/src/application/create-competition-draft/create-competition-draft.use-case.ts` (`rulesPreset`)
- `packages/statistics/src/domain/policies/build-competition-standings.test.ts`
- `packages/statistics/src/application/project-official-result/project-official-result.use-case.test.ts`
- `apps/api/src/adapters/scheduling/competition-fixture-source.test.ts`
- `apps/cli` `e2e-golden-path`, `statistics-smoke`, `standings`

#### Gaps

- No shared fixture module that yields official results plus expected table rows for the three formats.
- `groups-knockout` is in scheduling tests and in the parent story, but not in this QA task title. Include it as a fourth case if mixed rules share the same path. **Inferred.** Same reader bug as league-playoffs.
- `statistics-smoke` covers personal stats, not standings.
- `create-competition-draft.use-case.test.ts` and `generate-competition-fixture.use-case.test.ts` cover league only. Format structure for cup and playoffs lives in `generate-fixture-plan.test.ts`, which does not assert `resolutionMode` on playoff placeholders (`series` is null).
- `apps/api/src/http/routes/competitions.test.ts` has no GET `/standings`.
- `e2e-golden-path` always creates `format: "league"` and never calls standings.
- `ProjectOfficialResult` harness defaults `getPointsRules` to `independent_matches`. There is no aggregate_score projection test.

#### Behavior tests

Shared fixtures, then assert literals.

1. **League.** Four teams, one official slot per encounter, all 1-0 to home. Each team `played` equals the number of league encounters it has. Points are `3 * wins`.
2. **Cup (knockout).** Two-leg final 1-0 and 0-2. Each finalist `played` is 1. Winner has `goalsFor` 2, `goalsAgainst` 1, `points` 3.
3. **League-playoffs.** Regular 1-0 home win plus playoff two-leg 1-0 and 0-2. Home `played` is 2, `points` 3, not `played` 3.
4. **Idempotent replay.** Project the same approved result twice. Snapshot rows equal. `sourceRevisionMax` does not double.
5. **CLI or HTTP.** `npm run cli -- standings <orgId> <compId>` against the mixed fixture prints PJ 2 for that home team. This is an operator check, not a substitute for the domain test.

#### Notas

Depends on task 2. Put the three format fixtures next to the standings policy or under `packages/statistics` test support, with fake ports. Do not hit EA. Do not assert fixture JSON fingerprints as a proxy for PJ.

## Recommended implementation order

1. Stage on `EncounterScheduleSnapshot` (task 1).
2. Per-encounter mode in reader plus `buildCompetitionStandings` mix (task 2).
3. QA fixtures (task 6) as the proof of task 2. Same PR is fine.
4. API standings already works if the snapshot is mixed. Add team ranking contract (task 3) only after weights exist (task 5) or behind a documented empty snapshot.
5. UI table (task 4) last.

Task 5 can proceed in parallel with 1 and 2 because it does not need mixed PJ, but it should score from official table matches once task 2 exists.

## Open product calls

These cannot be settled from code.

1. One mixed table versus a regular table plus a separate knockout view. Notion says one table. Keep that unless product changes the parent story.
2. Whether standings rows expose how `played` was counted.
3. Numeric weights for `team-performance-v1`.
4. Whether FTR-RNK-001 stays MVP despite the Should tag.
5. Who may GET standings. Today `statistics.read`. Nav uses operator `competitions.update` then `competitions.read`.
6. Whether knockout or playoff points belong on the same table as the league, or only on the bracket. Notion says one mixed table. UX-SCP-003 only hides destinations that do not apply.
)
