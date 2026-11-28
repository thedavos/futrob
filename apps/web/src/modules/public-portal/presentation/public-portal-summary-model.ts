import type {
  GetPublicRankingResponse,
  GetPublicStandingsResponse,
  PublicRankingKindDto,
  PublicStandingRowDto,
} from "@futrob/api-contracts";

/**
 * Top rows highlighted as the qualifying zone. The places come from the fixture via the API
 * (FR-16); the table never guesses them. No cut is drawn when every row would qualify.
 */
export function publicStandingsCut(
  standings: Pick<GetPublicStandingsResponse["standings"], "qualifyingSpots" | "rows">,
): number | null {
  const spots = standings.qualifyingSpots;
  return spots !== null && spots < standings.rows.length ? spots : null;
}

export interface PublicStandingsGoalsLeader {
  readonly value: number;
  readonly teamNames: readonly string[];
  readonly perMatch: number | null;
}

export interface PublicStandingsSummary {
  readonly leader: {
    readonly teamName: string;
    readonly points: number;
    readonly leadOverSecond: number | null;
  } | null;
  readonly bestAttack: PublicStandingsGoalsLeader | null;
  readonly bestDefense: PublicStandingsGoalsLeader | null;
  readonly officialMatches: number;
  readonly teamCount: number;
}

/** Derives the 4 KPI summary values for the public standings strip (`ProfileKpiGroup`). */
export function publicStandingsSummary(
  standings: GetPublicStandingsResponse["standings"],
): PublicStandingsSummary {
  const { rows } = standings;
  const first = rows[0] ?? null;
  const second = rows[1] ?? null;
  const playedRows = rows.filter((row) => row.played > 0);
  const totalPlayed = rows.reduce((sum, row) => sum + row.played, 0);

  const pickGoalsLeader = (
    pick: (row: PublicStandingRowDto) => number,
    better: (candidate: number, current: number) => boolean,
  ): PublicStandingsGoalsLeader | null => {
    if (playedRows.length === 0) return null;
    let best = pick(playedRows[0]!);
    for (const row of playedRows.slice(1)) {
      const value = pick(row);
      if (better(value, best)) best = value;
    }
    const winners = playedRows.filter((row) => pick(row) === best);
    const single = winners.length === 1 ? winners[0] : null;
    return {
      value: best,
      teamNames: winners.map((row) => row.teamName),
      perMatch: single && single.played > 0 ? best / single.played : null,
    };
  };

  return {
    leader: first
      ? {
          teamName: first.teamName,
          points: first.points,
          leadOverSecond: second ? first.points - second.points : null,
        }
      : null,
    bestAttack: pickGoalsLeader(
      (row) => row.goalsFor,
      (candidate, current) => candidate > current,
    ),
    bestDefense: pickGoalsLeader(
      (row) => row.goalsAgainst,
      (candidate, current) => candidate < current,
    ),
    officialMatches: Math.floor(totalPlayed / 2),
    teamCount: rows.length,
  };
}

export interface PublicRankingSummary {
  readonly leader: {
    readonly playerName: string;
    readonly teamName: string | null;
    readonly value: number;
    readonly lead: number | null;
  } | null;
  readonly runnerUp: {
    readonly playerName: string;
    readonly teamName: string | null;
  } | null;
  readonly playerCount: number;
  readonly teamCount: number;
  readonly bestPerMatch: {
    readonly playerName: string;
    readonly teamName: string | null;
    readonly rate: number;
  } | null;
}

export function rankingUsesPerMatchRate(kind: PublicRankingKindDto): boolean {
  return kind !== "rating";
}

export function publicRankingSummary(
  ranking: GetPublicRankingResponse["ranking"],
): PublicRankingSummary {
  const { kind, rows } = ranking;
  const first = rows[0] ?? null;
  const second = rows[1] ?? null;
  const teams = new Set(
    rows.map((row) => row.teamName).filter((name): name is string => name !== null),
  );

  let bestPerMatch: PublicRankingSummary["bestPerMatch"] = null;
  if (rankingUsesPerMatchRate(kind)) {
    for (const row of rows) {
      if (row.matchesPlayed <= 0) continue;
      const rate = row.value / row.matchesPlayed;
      if (bestPerMatch === null || rate > bestPerMatch.rate) {
        bestPerMatch = { playerName: row.playerName, teamName: row.teamName, rate };
      }
    }
  }

  return {
    leader: first
      ? {
          playerName: first.playerName,
          teamName: first.teamName,
          value: first.value,
          lead: second ? Number((first.value - second.value).toFixed(2)) : null,
        }
      : null,
    runnerUp: second ? { playerName: second.playerName, teamName: second.teamName } : null,
    playerCount: rows.length,
    teamCount: teams.size,
    bestPerMatch,
  };
}
