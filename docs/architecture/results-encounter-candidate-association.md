# Encounter candidate association

Results owns eligibility of a `ProviderMatch` for an `Encounter`. Game-data keeps the observation. Persistence is `apps/api/migrations/0046_encounter_candidates.sql` with `PostgresEncounterCandidateAssociationRepository` (in-memory twin for DB-less runs).

## Product defaults

- Window is DEC-023. `CANDIDATE_WINDOW_HALF_HOURS = 6`. Inclusive `[from, to]` around `scheduledStartAt`.
- Per-competition 1–24h configuration is not in this wave.
- DEC-024. Recalc after `scheduling.encounter-rescheduled` keeps prior rows and sets `eligible = false` when they leave the new window. It inserts newly in-window refs. It does not mutate `OfficialMatchSelection` slots.

## Postgres schema

```sql
CREATE TABLE IF NOT EXISTS encounter_candidates (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  encounter_id TEXT NOT NULL,
  provider_key TEXT NOT NULL,
  external_match_id TEXT NOT NULL,
  eligible BOOLEAN NOT NULL,
  associated_at TIMESTAMPTZ NOT NULL,
  last_evaluated_at TIMESTAMPTZ NOT NULL,
  UNIQUE (organization_id, encounter_id, provider_key, external_match_id)
);

CREATE TABLE IF NOT EXISTS encounter_candidate_sets (
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  encounter_id TEXT NOT NULL,
  generation INTEGER NOT NULL,
  PRIMARY KEY (organization_id, encounter_id)
);

CREATE INDEX IF NOT EXISTS encounter_candidates_encounter_eligible_index
  ON encounter_candidates (organization_id, encounter_id, eligible);
```

Do not copy score, clubs, players, or raw payload into this table. Join `provider_matches` by `(provider_key, external_match_id)` when a projection needs observation fields. Adapters must filter every query by `organization_id`.

`id` is deterministic: `{organizationId}:{encounterId}:{providerKey}:{externalId}`. Upsert keeps that primary key. `replaceForEncounter` upserts the new set and deletes only the rows that left it, so a concurrent `writeIfEligible` never sees a row vanish and reappear.

`encounter_candidate_sets.generation` is the compare-and-swap token for a full-set reconcile. `replaceForEncounter` must no-op and return `conflict` when `expectedGeneration` does not match. Associate and recalc re-read the Encounter and retry, so a stale window cannot overwrite a newer recalc.

`writeIfEligible` is the select conditional write. Adapters must re-read eligibility and persist the selection in one Encounter-scoped critical section (in-memory mutex; Postgres runs one transaction that takes `SELECT ... FOR SHARE` on the required rows, so a concurrent replace waits until it ends). Recalc that marks a row ineligible before that write makes select fail with `results.candidate_not_associated`.

## Application API

- `AssociateEncounterCandidatesUseCase` upserts the current window. Idempotent.
- `RecalculateEncounterCandidatesUseCase` is the same reconcile keyed by `encounterId` from `scheduling.encounter-rescheduled`.
- `SelectOfficialMatchesUseCase` requires an associated row with `eligible = true`. Code `results.candidate_not_associated` otherwise. Failed select does not overwrite the previous selection.

`ListEncounterCandidatesUseCase` stays a live window read. Persist is for history and select integrity.

## DI and consumers

Wired in `apps/api/src/di/results.module.ts`:

- `EncounterCandidateAssociationRepository`: the Postgres adapter exists; the module picks it when a pool is available (see `results.module.ts`).
- `associateEncounterCandidates` and `recalculateEncounterCandidates` on the results module.

Not covered here:

- `apps/api/src/app.ts` queue or outbox consumer for `scheduling.encounter-rescheduled`.
- `apps/api/src/di/scheduling.module.ts` (`OfficialResultFixtureEditGuard` still blocks reschedule after a proposal).
- OpenAPI, SDK, HTTP associate/recalc routes.

A later consumer should persist the new kickoff first, then call `recalculateEncounterCandidates.execute({ encounterId })`. Replay of the same event must converge.
