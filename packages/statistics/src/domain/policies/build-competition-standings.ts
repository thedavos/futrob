import type { TeamId } from "@futrob/shared-kernel";
import {
  COMPETITION_STANDING_FORMULA_VERSION,
  type CompetitionStandingRow,
  type CompetitionStandingSnapshot,
} from "../entities/competition-standing-snapshot.ts";
import type { TeamMatchContribution } from "../entities/team-match-contribution.ts";
import type { CompetitionMatchPointsRules } from "../ports/competition-match-rules-reader.port.ts";

export const DEFAULT_COMPETITION_MATCH_POINTS: CompetitionMatchPointsRules = {
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
};

export function buildCompetitionStandings(input: {
  readonly competitionId: CompetitionStandingSnapshot["competitionId"];
  readonly organizationId: CompetitionStandingSnapshot["organizationId"];
  readonly contributions: readonly TeamMatchContribution[];
  readonly pointsRules: CompetitionMatchPointsRules;
  readonly updatedAt: Date;
}): CompetitionStandingSnapshot {
  const byTeam = new Map<TeamId, MutableStanding>();

  for (const contribution of input.contributions) {
    if (contribution.correlationStatus !== "matched" || contribution.teamId === null) continue;
    const standing =
      byTeam.get(contribution.teamId) ??
      ({
        teamId: contribution.teamId,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
        sourceRevisionMax: 0,
      } satisfies MutableStanding);
    standing.played += 1;
    standing.goalsFor += contribution.goalsFor;
    standing.goalsAgainst += contribution.goalsAgainst;
    standing.sourceRevisionMax = Math.max(standing.sourceRevisionMax, contribution.revision);

    if (contribution.goalsFor > contribution.goalsAgainst) {
      standing.wins += 1;
      standing.points += input.pointsRules.winPoints;
    } else if (contribution.goalsFor === contribution.goalsAgainst) {
      standing.draws += 1;
      standing.points += input.pointsRules.drawPoints;
    } else {
      standing.losses += 1;
      standing.points += input.pointsRules.lossPoints;
    }
    byTeam.set(contribution.teamId, standing);
  }

  const sorted = [...byTeam.values()].sort(compareStandings);
  const rows: CompetitionStandingRow[] = sorted.map((standing, index) => ({
    position: index + 1,
    teamId: standing.teamId,
    played: standing.played,
    wins: standing.wins,
    draws: standing.draws,
    losses: standing.losses,
    goalsFor: standing.goalsFor,
    goalsAgainst: standing.goalsAgainst,
    goalDifference: standing.goalsFor - standing.goalsAgainst,
    points: standing.points,
  }));

  return {
    competitionId: input.competitionId,
    organizationId: input.organizationId,
    formulaVersion: COMPETITION_STANDING_FORMULA_VERSION,
    rows,
    sourceRevisionMax:
      rows.length === 0 ? 0 : Math.max(...sorted.map((row) => row.sourceRevisionMax)),
    updatedAt: input.updatedAt,
  };
}

interface MutableStanding {
  teamId: TeamId;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  sourceRevisionMax: number;
}

function compareStandings(left: MutableStanding, right: MutableStanding): number {
  const leftGd = left.goalsFor - left.goalsAgainst;
  const rightGd = right.goalsFor - right.goalsAgainst;
  return (
    right.points - left.points ||
    rightGd - leftGd ||
    right.goalsFor - left.goalsFor ||
    left.teamId.localeCompare(right.teamId)
  );
}
