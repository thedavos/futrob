# Team performance ranking v1

**Formula version:** `team-performance-v1`  
**Range:** integer 0–100  
**Owner:** statistics (product weights here; domain applies this table only)  
**Distinct from:** official standings (`points-gd-gf-v1`) and player rankings (`player-ranking-v1`)

DEC-041: a versioned 0–100 team performance score from **results**, **goal difference**, **recent form**, and **offensive/defensive efficiency when those metrics exist**. Missing metrics stay absent; they are never stored or scored as zero.

This table is the product contract. The executable constants are `TEAM_PERFORMANCE_WEIGHTS` in [team-performance-v1.ts](/packages/statistics/src/domain/policies/team-performance-v1.ts); keep them aligned with this table. Consumers import those constants rather than inventing a second coefficient set. Do not reuse game-data player-attribute `WEIGHTS`.

## Weight table

| Component            | Key                   | Weight | Declared input (0–100, already normalized)                    |
| -------------------- | --------------------- | -----: | ------------------------------------------------------------- |
| Results              | `results`             |     40 | Points or win rate for official results in the ranking window |
| Goal difference      | `goalDifference`      |     20 | Goal difference scaled to the competition window              |
| Recent form          | `recentForm`          |     20 | Form over the most recent official encounters                 |
| Offensive efficiency | `offensiveEfficiency` |     10 | Attacking conversion when the payload provides it             |
| Defensive efficiency | `defensiveEfficiency` |     10 | Defensive prevention when the payload provides it             |

Weights sum to 100. Each component is a 0–100 score supplied by statistics from official results only.

## Scoring

```
score = round(
  results * 0.40 +
  goalDifference * 0.20 +
  recentForm * 0.20 +
  offensiveEfficiency * 0.10 +
  defensiveEfficiency * 0.10
)
```

The same complete input must yield the same integer (reproducible). If any listed component is missing, the policy **fails closed**: it returns `incomplete` with the missing keys and does not emit a score. Absent metrics are not zero-filled and are not renormalized.

## Derivation contract

The weights and fail-closed behavior above are existing product decisions (DEC-040/041).
The owner confirmed **all competition**, **last five encounters for form**, and **at
least three official encounters** for this implementation. DEC-043 concerns player
eligibility; this team minimum is a separate decision, not an extension of that rule.

The definitions below close previously unspecified normalization rules. They are
implementation proposals adopted for this cut, rather than rules inferred from the
old PRD or Notion tasks. In particular, defensive efficiency is **opponent shot
non-conversion**, not goalkeeper save percentage, shots-on-target prevention or a
prediction. There is no authoritative shots-on-target field in the current source.
Changing these definitions requires a new normalization version.

| Contract             | Version                             |
| -------------------- | ----------------------------------- |
| Weighted score       | `team-performance-v1` (unchanged)   |
| Component derivation | `team-performance-normalization-v1` |
| Window/minimum       | `competition-all-form-5-min-3-v1`   |

### Available official sources

Statistics owns `TeamMatchContribution`: per official slot and team side it records
the official scoreboard, frozen `resolutionMode`, team correlation, official result
ID/revision, and strict player rollups including `shots`. If any player lacks shots,
that slot's team shots remain null. Saves and tackles also exist but do not replace
shots or establish shots on target.

Results owns immutable official slot snapshots including `occurredAt` and provider
reference. The Statistics adapter uses the public Results reader to obtain those
timestamps and the latest revision/status per encounter. It does not call EA, read
foreign tables, use fixture dates or approval dates to order form, or depend on the
host's current day/time zone. No new timestamp is synthesized for old contributions.

Only contributions matching a latest **approved** official result, revision and
slot enter the ranking. Both sides of every approved slot must be projected and
their scoreboards must agree with the official source; otherwise the snapshot is
`projectionComplete: false` and every row is incomplete until reconstruction.
Voids remain in snapshot provenance/fingerprints but contribute no matches.

### Window, units and ordering

The window contains every current approved official slot in the competition, across
regular, group and knockout stages. There is no rolling calendar cutoff. `from` and
`through` are the earliest/latest included official timestamps, or null without data.

- `independent_matches`: each official slot is one competitive unit.
- `aggregate_score`: all slots in an encounter form one competitive unit, using
  summed goals for/against. Slot statistics remain separate for shot efficiency.
- Wins/draws/losses use the scoreboard, without penalties, away-goals inference,
  seeds or bracket qualification. An aggregate draw stays a draw for performance.
- Byes have no official slot/score and contribute neither units nor encounters.
- The three-encounter minimum counts distinct encounters, regardless of slot count.
- Recent form takes up to five distinct encounters ordered by the maximum official
  slot `occurredAt` descending, then encounter ID ascending in code-unit order.
  An encounter's independent slots carry equal weight within that encounter; the
  encounters themselves carry equal weight in form. Aggregated series count once.

The participant universe includes approved CompetitionEntries plus teams with
current matched official contributions (so historical participants are preserved).
An approved team with no appearances has `incomplete`, null score/position and
`coverage.reason: no_data`. Fewer than three encounters gives `insufficient_sample`:
all five components are null, with all five missing keys. Evidence/counts remain
visible and are not a certified score.

### Exact formulas and denominators

Let `P` be competitive units; `W/D/L` their outcomes; `E` distinct encounters.
Performance outcome credits are fixed **3/1/0**, independent of an organizer's
standings points. They are normalization inputs, never added to standings.

| Component            | Definition                                                                                                                                                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Results              | `100 × (3W + D) / (3P)`                                                                                                                                                                                                    |
| DG                   | `g = Σ(goalsFor − goalsAgainst) / P`; across all teams with `E ≥ 3`, let `lo=min(g)` and `hi=max(g)`. If `hi>lo`, `100 × (g−lo)/(hi−lo)`; if all comparables have the same DG, assign neutral 50 explicitly (no division). |
| Recent form          | For each of the selected encounters, average 3/1/0 credits over its competitive units. `100 × sum(encounter averages) / (3 × selected encounters)`                                                                         |
| Offensive efficiency | `100 × Σofficial scoreboard goalsFor / Σown slot shots`                                                                                                                                                                    |
| Defensive efficiency | `100 × (1 − Σofficial scoreboard goalsAgainst / Σopponent slot shots)`; opponent shots come from the opposite contribution of the exact same official result/revision/slot.                                                |

No intermediate component is rounded; the existing `scoreTeamPerformance` rounds
the final weighted sum to an integer. Shot sums require complete coverage of the
window. Null, nonfinite, negative or non-integer shot counts, a zero denominator,
or a numerator exceeding its denominator make that efficiency component null.
Missing components are listed; no zero fill, alternative metric, subset averaging
or weight renormalization applies. A true numerator zero with positive complete
denominator is valid. The equal-DG rule is an explicit neutral case, not an invalid
denominator hidden behind a fallback. Teams below the minimum are not DG comparables;
teams with sufficient outcomes but missing efficiency remain DG comparables.

Because DG is relative, approving, correcting or voiding even an old result can
change other teams' DG normalization. Rebuild always replaces the entire comparable
set, including recent form and opponent-shot effects. It never patches just two rows.

### Literal examples

Three encounters, each A wins 2–0 against B, and both teams report 4 shots per slot:

| Team |       Results |  DG | Form |        Attack |            Defense | Weighted score |
| ---- | ------------: | --: | ---: | ------------: | -----------------: | -------------: |
| A    | `100×9/9=100` | 100 |  100 | `100×6/12=50` | `100×(1−0/12)=100` |         **95** |
| B    |             0 |   0 |    0 |  `100×0/12=0` |  `100×(1−6/12)=50` |          **5** |

If each side reports 2 shots instead, A scores **100**, B **0**. Three 1–1 draws
with 2 shots per side yield components `(100/3,50,100/3,50,50)` and both score **40**.
If B's shots are null in one of the original three encounters, A's defensive
component is null and A has **no score**, even though its other four components exist.
If B has no shots throughout (`0`), the same denominator rule applies; a clean sheet
does not invent a 100 defensive score without a positive observed denominator.

For mixed stages: an independent encounter with one win and one loss, an aggregate
series won 3–2 over two slots, and a drawn independent encounter have `P=4`, `E=3`,
results `100×7/12=58.333…`, and form `100×(1.5+3+1)/9=61.111…`.

### Snapshot, ties and traceability

`TeamPerformanceRankingSnapshot` is separate from standings and player rankings,
scoped by organization, competition and the three version IDs. It persists window,
components, missing keys, coverage counts/reason, component numerators/denominators,
contribution IDs and latest official revision/status provenance. Its SHA-256
`revisionFingerprint` covers a canonical sorted set of participants, all latest
official sources (including voids), official slot metadata and all used derivation
inputs, including resolution modes and shots. A maximum revision is not a fingerprint.

Complete rows sort by integer score descending, then team ID ascending in code-unit
order. Equal scores share competition positions (`1,1,3`). Incomplete rows follow in
team-ID order and have no position/score. A different `updatedAt` after replay is
allowed; identical sources and versions produce identical rows and scores. Previous
version keys stay stored; changing a derivation never overwrites another version.

### Read/update boundary

Private `GET /organizations/{organizationId}/competitions/{competitionId}/team-performance-ranking`
requires `STATISTICS_PERMISSION.read` and returns `{ ranking }`, nullable before the
first rebuild. SDK: `statistics.getTeamPerformanceRanking`; web BFF proxies the same
route using the trusted session actor. No raw provider/player payload is returned.

Approval/anulation composition and full Statistics reconstruction call the rebuild
directly under the product transaction and a competition-wide lock. The lock is
acquired before reading sources; compare-and-set also rejects a stale replacement.
Exceptions after official/projection writes roll back the shared Postgres transaction.
An incomplete statistical component is valid coverage data, not a persistence failure.
The no-op publisher is not involved. Memory stores serialize within a process but
do not promise durable rollback. See [ADR-0016](/docs/adr/0016-official-results-transactional-projection.md).

## Out of scope

No UI, public/premium resource, analytics ownership, predictions, payments or editable
weights. Standings and player ranking kinds remain compatible and independent.
