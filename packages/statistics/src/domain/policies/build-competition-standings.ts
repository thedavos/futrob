import type { TeamId } from "@futrob/shared-kernel";
import {
  COMPETITION_STANDING_FORMULA_VERSION,
  type CompetitionStandingRow,
  type CompetitionStandingSnapshot,
} from "../entities/competition-standing-snapshot.ts";
import type { TeamMatchContribution } from "../entities/team-match-contribution.ts";
import type {
  CompetitionMatchPointsRules,
  StandingResolutionMode,
} from "../ports/competition-match-rules-reader.port.ts";

export const DEFAULT_COMPETITION_MATCH_POINTS: CompetitionMatchPointsRules = {
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  resolutionMode: "independent_matches",
};

interface StandingMatch {
  readonly teamId: TeamId;
  readonly goalsFor: number;
  readonly goalsAgainst: number;
  readonly revision: number;
}

export function buildCompetitionStandings(input: {
  readonly competitionId: CompetitionStandingSnapshot["competitionId"];
  readonly organizationId: CompetitionStandingSnapshot["organizationId"];
  readonly contributions: readonly TeamMatchContribution[];
  readonly pointsRules: CompetitionMatchPointsRules;
  readonly updatedAt: Date;
}): CompetitionStandingSnapshot {
  const byTeam = new Map<TeamId, MutableStanding>();
  const resolutionMode = input.pointsRules.resolutionMode;

  for (const match of matchesForStandings(input.contributions, resolutionMode)) {
    const standing =
      byTeam.get(match.teamId) ??
      ({
        teamId: match.teamId,
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
    standing.goalsFor += match.goalsFor;
    standing.goalsAgainst += match.goalsAgainst;
    standing.sourceRevisionMax = Math.max(standing.sourceRevisionMax, match.revision);

    if (match.goalsFor > match.goalsAgainst) {
      standing.wins += 1;
      standing.points += input.pointsRules.winPoints;
    } else if (match.goalsFor === match.goalsAgainst) {
      standing.draws += 1;
      standing.points += input.pointsRules.drawPoints;
    } else {
      standing.losses += 1;
      standing.points += input.pointsRules.lossPoints;
    }
    byTeam.set(match.teamId, standing);
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

function isMatchedTeamContribution(
  contribution: TeamMatchContribution,
): contribution is TeamMatchContribution & { readonly teamId: TeamId } {
  return contribution.correlationStatus === "matched" && contribution.teamId !== null;
}

function matchesForStandings(
  contributions: readonly TeamMatchContribution[],
  resolutionMode: StandingResolutionMode,
): StandingMatch[] {
  const matched = contributions.filter(isMatchedTeamContribution);
  switch (resolutionMode) {
    case "independent_matches":
      return matched.map((contribution) => ({
        teamId: contribution.teamId,
        goalsFor: contribution.goalsFor,
        goalsAgainst: contribution.goalsAgainst,
        revision: contribution.revision,
      }));
    case "aggregate_score":
      return aggregateEncounterMatches(matched);
    default:
      return assertNever(resolutionMode);
  }
}

function aggregateEncounterMatches(
  contributions: readonly (TeamMatchContribution & { readonly teamId: TeamId })[],
): StandingMatch[] {
  const byEncounterTeam = new Map<string, StandingMatch>();
  for (const contribution of contributions) {
    const key = `${contribution.encounterId}:${contribution.teamId}`;
    const current = byEncounterTeam.get(key);
    if (current === undefined) {
      byEncounterTeam.set(key, {
        teamId: contribution.teamId,
        goalsFor: contribution.goalsFor,
        goalsAgainst: contribution.goalsAgainst,
        revision: contribution.revision,
      });
      continue;
    }
    byEncounterTeam.set(key, {
      teamId: contribution.teamId,
      goalsFor: current.goalsFor + contribution.goalsFor,
      goalsAgainst: current.goalsAgainst + contribution.goalsAgainst,
      revision: Math.max(current.revision, contribution.revision),
    });
  }
  return [...byEncounterTeam.values()];
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

function assertNever(value: never): never {
  throw new RangeError(`Unsupported standing resolution mode: ${String(value)}`);
}
