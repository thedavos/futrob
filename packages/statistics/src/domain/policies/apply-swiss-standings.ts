import type { TeamId } from "@futrob/shared-kernel";
import {
  COMPETITION_STANDING_SWISS_FORMULA_VERSION,
  type CompetitionStandingRow,
  type CompetitionStandingSnapshot,
} from "../entities/competition-standing-snapshot.ts";
import type {
  CompetitionSwissProgress,
  CompetitionSwissStandingContext,
} from "../ports/competition-swiss-standing-reader.port.ts";

export interface SwissStandingSnapshot extends Omit<CompetitionStandingSnapshot, "formulaVersion"> {
  readonly formulaVersion: typeof COMPETITION_STANDING_SWISS_FORMULA_VERSION;
  readonly swiss: CompetitionSwissProgress;
}

/**
 * The Swiss table over the official snapshot, computed on each read (ADR-0027, section 4): byes
 * and withdrawals never rebuild the snapshot, which keeps holding approved results only. Order:
 * points, Buchholz, goal difference, goals for, seed. Played and W/D/L stay official, so a bye
 * adds points but no match.
 */
export function applySwissStandings(
  snapshot: CompetitionStandingSnapshot,
  context: CompetitionSwissStandingContext,
): SwissStandingSnapshot {
  const progress: CompetitionSwissProgress = {
    roundsTotal: context.roundsTotal,
    roundsCompleted: context.roundsCompleted,
    currentRound: context.currentRound,
    isFinal: context.isFinal,
  };
  const base = {
    ...snapshot,
    formulaVersion: COMPETITION_STANDING_SWISS_FORMULA_VERSION,
    swiss: progress,
  };
  if (snapshot.rows.length === 0 && context.opponentsByTeam.size === 0) return base;

  const official = new Map(snapshot.rows.map((row) => [row.teamId, row]));
  const seedOrder = new Map(context.seed.map((teamId, index) => [teamId, index]));
  const teamIds = [...new Set([...context.seed, ...official.keys()])];
  const byesOf = (teamId: TeamId) => context.byesByTeam.get(teamId) ?? 0;
  const points = new Map(
    teamIds.map((teamId) => [
      teamId,
      (official.get(teamId)?.points ?? 0) + byesOf(teamId) * context.pointsPerBye,
    ]),
  );
  const pointsOf = (teamId: TeamId) => points.get(teamId) ?? 0;
  const withdrawn = new Set(context.withdrawnTeamIds);

  const rows = teamIds
    .map((teamId): CompetitionStandingRow => {
      const row = official.get(teamId) ?? emptyRow(teamId);
      const rivals = context.opponentsByTeam.get(teamId) ?? [];
      return {
        ...row,
        points: pointsOf(teamId),
        swiss: {
          // A bye counts the Team itself as a virtual rival, so resting costs no Buchholz.
          buchholz:
            rivals.reduce((total, rival) => total + pointsOf(rival), 0) +
            byesOf(teamId) * pointsOf(teamId),
          byes: byesOf(teamId),
          withdrawn: withdrawn.has(teamId),
        },
      };
    })
    .sort(
      (left, right) =>
        right.points - left.points ||
        (right.swiss?.buchholz ?? 0) - (left.swiss?.buchholz ?? 0) ||
        right.goalDifference - left.goalDifference ||
        right.goalsFor - left.goalsFor ||
        (seedOrder.get(left.teamId) ?? seedOrder.size) -
          (seedOrder.get(right.teamId) ?? seedOrder.size),
    )
    .map((row, index) => ({ ...row, position: index + 1 }));

  return { ...base, rows };
}

function emptyRow(teamId: TeamId): CompetitionStandingRow {
  return {
    position: 1,
    teamId,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    form: [],
  };
}
