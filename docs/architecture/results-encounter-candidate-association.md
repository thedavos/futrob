# Encounter candidate association (pending Postgres)

Results owns eligibility of a `ProviderMatch` for an `Encounter`. Game-data keeps the observation. This wave does not add a numbered migration because Agent A owns `apps/api/migrations/0037_*.sql`. Ship `0038_encounter_candidates.sql` after that lands.

## Product defaults

- Window is DEC-023. `CANDIDATE_WINDOW_HALF_HOURS = 6`. Inclusive `[from, to]` around `scheduledStartAt`.
- Per-competition 1–24h configuration is not in this wave.
- DEC-024. Recalc after `scheduling.encounter-rescheduled` keeps prior rows and sets `eligible = false` when they leave the new window. It inserts newly in-window refs. It does not mutate `OfficialMatchSelection` slots.

## Proposed Postgres schema

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

CREATE INDEX IF NOT EXISTS encounter_candidates_encounter_eligible_index
  ON encounter_candidates (organization_id, encounter_id, eligible);
```

Do not copy score, clubs, players, or raw payload into this table. Join `provider_matches` by `(provider_key, external_match_id)` when a projection needs observation fields. Adapters must filter every query by `organization_id`.

`id` is deterministic: `{organizationId}:{encounterId}:{providerKey}:{externalId}`. Upsert keeps that primary key.

## Application API

- `AssociateEncounterCandidatesUseCase` upserts the current window. Idempotent.
- `RecalculateEncounterCandidatesUseCase` is the same reconcile keyed by `encounterId` from `scheduling.encounter-rescheduled`.
- `SelectOfficialMatchesUseCase` requires an associated row with `eligible = true`. Code `results.candidate_not_associated` otherwise. Failed select does not overwrite the previous selection.

`ListEncounterCandidatesUseCase` stays a live window read. Persist is for history and select integrity.

## Pending DI and consumers

Wired in `apps/api/src/di/results.module.ts`:

- In-memory `EncounterCandidateAssociationRepository` even when `DATABASE_URL` is set.
- `associateEncounterCandidates` and `recalculateEncounterCandidates` on the results module.

Not in this wave (avoid parallel edits with Agent A):

- Numbered migration `0038_*.sql` and a Postgres adapter.
- `apps/api/src/app.ts` queue or outbox consumer for `scheduling.encounter-rescheduled`.
- `apps/api/src/di/scheduling.module.ts` (`OfficialResultFixtureEditGuard` still blocks reschedule after a proposal).
- OpenAPI, SDK, HTTP associate/recalc routes.

A later consumer should persist the new kickoff first, then call `recalculateEncounterCandidates.execute({ encounterId })`. Replay of the same event must converge.
