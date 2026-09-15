# Team performance ranking v1

**Formula version:** `team-performance-v1`  
**Range:** integer 0–100  
**Owner:** statistics (product weights here; domain applies this table only)  
**Distinct from:** official standings (`points-gd-gf-v1`) and player rankings (`player-ranking-v1`)

DEC-041: a versioned 0–100 team performance score from **results**, **goal difference**, **recent form**, and **offensive/defensive efficiency when those metrics exist**. Missing metrics stay absent; they are never stored or scored as zero.

This table is the product contract. Domain code must import these weights rather than inventing a second coefficient set. Do not reuse game-data player-attribute `WEIGHTS`.

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

## Out of scope for this cut

- No `TeamPerformanceRankingSnapshot` persistence or HTTP resource yet
- No standings UI mix-in; table and performance ranking remain separate (AC-RNK-001)
- Organizer-configurable weights wait for a later version id
