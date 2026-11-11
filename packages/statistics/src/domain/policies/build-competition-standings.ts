import { assertNever, type TeamId } from "@futrob/shared-kernel";
import {
  COMPETITION_STANDING_FORMULA_VERSION,
  STANDING_FORM_LENGTH,
  type CompetitionStandingRow,
  type CompetitionStandingSnapshot,
  type StandingFormResult,
} from "../entities/competition-standing-snapshot.ts";
import {
  officialSlotKey,
  type TeamMatchContribution,
} from "../entities/team-match-contribution.ts";
import type { CompetitionMatchPointsRules } from "../ports/competition-match-rules-reader.port.ts";
import type { CompetitionPointDeduction } from "../ports/competition-point-deduction-reader.port.ts";

export const DEFAULT_COMPETITION_MATCH_POINTS: CompetitionMatchPointsRules = {
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  resolutionMode: "independent_matches",
};

interface StandingMatch {
  readonly teamId: TeamId;
  readonly encounterId: TeamMatchContribution["encounterId"];
  readonly officialSlot: TeamMatchContribution["officialSlot"];
  readonly goalsFor: number;
  readonly goalsAgainst: number;
  readonly revision: number;
  readonly occurredAt: Date | null;
}

type TimedStandingMatch = StandingMatch & { readonly occurredAt: Date };

export function buildCompetitionStandings(input: {
  readonly competitionId: CompetitionStandingSnapshot["competitionId"];
  readonly organizationId: CompetitionStandingSnapshot["organizationId"];
  readonly contributions: readonly TeamMatchContribution[];
  readonly pointsRules: CompetitionMatchPointsRules;
  readonly pointsByEncounter?: ReadonlyMap<string, CompetitionMatchPointsRules>;
  /** Active sanctions: subtracted from points; a Team listed here appears even unplayed. */
  readonly pointDeductions?: readonly CompetitionPointDeduction[];
  /** Official slot time keyed by `officialSlotKey`. */
  readonly occurredAtBySlot: ReadonlyMap<string, Date>;
  readonly updatedAt: Date;
}): CompetitionStandingSnapshot {
  const byTeam = new Map<TeamId, MutableStanding>();

  const standingOf = (teamId: TeamId): MutableStanding =>
    byTeam.get(teamId) ??
    ({
      teamId,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
      pointsDeducted: 0,
      sourceRevisionMax: 0,
      timedMatches: [],
    } satisfies MutableStanding);

  for (const match of matchesForStandings(input.contributions, input.occurredAtBySlot)) {
    const standing = standingOf(match.teamId);
    standing.played += 1;
    standing.goalsFor += match.goalsFor;
    standing.goalsAgainst += match.goalsAgainst;
    standing.sourceRevisionMax = Math.max(standing.sourceRevisionMax, match.revision);
    if (isTimed(match)) standing.timedMatches.push(match);

    const points = pointsFor(match, input);
    switch (outcomeOf(match)) {
      case "win":
        standing.wins += 1;
        standing.points += points.winPoints;
        break;
      case "draw":
        standing.draws += 1;
        standing.points += points.drawPoints;
        break;
      case "loss":
        standing.losses += 1;
        standing.points += points.lossPoints;
        break;
    }
    byTeam.set(match.teamId, standing);
  }

  for (const deduction of input.pointDeductions ?? []) {
    const standing = standingOf(deduction.teamId);
    standing.points -= deduction.points;
    standing.pointsDeducted += deduction.points;
    byTeam.set(deduction.teamId, standing);
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
    pointsDeducted: standing.pointsDeducted,
    form: formFor(standing.timedMatches),
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
  occurredAtBySlot: ReadonlyMap<string, Date>,
): StandingMatch[] {
  const matched = contributions.filter(isMatchedTeamContribution);
  const independent: typeof matched = [];
  const aggregate: typeof matched = [];
  for (const contribution of matched) {
    switch (contribution.resolutionMode) {
      case "independent_matches":
        independent.push(contribution);
        break;
      case "aggregate_score":
        aggregate.push(contribution);
        break;
      default:
        assertNever(contribution.resolutionMode, "Unsupported standing resolution mode");
    }
  }
  return [
    ...independent.map((contribution) => slotMatch(contribution, occurredAtBySlot)),
    ...aggregateEncounterMatches(aggregate, occurredAtBySlot),
  ];
}

function slotMatch(
  contribution: TeamMatchContribution & { readonly teamId: TeamId },
  occurredAtBySlot: ReadonlyMap<string, Date>,
): StandingMatch {
  return {
    teamId: contribution.teamId,
    encounterId: contribution.encounterId,
    officialSlot: contribution.officialSlot,
    goalsFor: contribution.goalsFor,
    goalsAgainst: contribution.goalsAgainst,
    revision: contribution.revision,
    occurredAt: occurredAtBySlot.get(officialSlotKey(contribution)) ?? null,
  };
}

function aggregateEncounterMatches(
  contributions: readonly (TeamMatchContribution & { readonly teamId: TeamId })[],
  occurredAtBySlot: ReadonlyMap<string, Date>,
): StandingMatch[] {
  const byEncounterTeam = new Map<string, StandingMatch>();
  for (const contribution of contributions) {
    const key = `${contribution.encounterId}:${contribution.teamId}`;
    const slot = slotMatch(contribution, occurredAtBySlot);
    const current = byEncounterTeam.get(key);
    if (current === undefined) {
      byEncounterTeam.set(key, slot);
      continue;
    }
    const latest = compareMatchTime(current, slot) >= 0 ? current : slot;
    byEncounterTeam.set(key, {
      teamId: contribution.teamId,
      encounterId: contribution.encounterId,
      officialSlot: latest.officialSlot,
      goalsFor: current.goalsFor + slot.goalsFor,
      goalsAgainst: current.goalsAgainst + slot.goalsAgainst,
      revision: Math.max(current.revision, slot.revision),
      occurredAt: latest.occurredAt,
    });
  }
  return [...byEncounterTeam.values()];
}

function isTimed(match: StandingMatch): match is TimedStandingMatch {
  return match.occurredAt !== null;
}

function compareMatchTime(left: StandingMatch, right: StandingMatch): number {
  if (left.occurredAt === null || right.occurredAt === null) {
    return Number(left.occurredAt !== null) - Number(right.occurredAt !== null);
  }
  return (
    left.occurredAt.getTime() - right.occurredAt.getTime() ||
    left.encounterId.localeCompare(right.encounterId) ||
    left.officialSlot - right.officialSlot
  );
}

function formFor(matches: readonly TimedStandingMatch[]): StandingFormResult[] {
  return [...matches]
    .sort(compareMatchTime)
    .slice(-STANDING_FORM_LENGTH)
    .map((match) => outcomeOf(match));
}

function outcomeOf(match: StandingMatch): StandingFormResult {
  if (match.goalsFor > match.goalsAgainst) return "win";
  if (match.goalsFor === match.goalsAgainst) return "draw";
  return "loss";
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
  pointsDeducted: number;
  sourceRevisionMax: number;
  timedMatches: TimedStandingMatch[];
}

function pointsFor(
  match: StandingMatch,
  input: {
    readonly pointsRules: CompetitionMatchPointsRules;
    readonly pointsByEncounter?: ReadonlyMap<string, CompetitionMatchPointsRules>;
  },
): CompetitionMatchPointsRules {
  return input.pointsByEncounter?.get(match.encounterId) ?? input.pointsRules;
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
