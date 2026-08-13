import type { CompetitionId, OrganizationId, TeamId } from "@futrob/shared-kernel";

export const COMPETITION_STANDING_FORMULA_VERSION = "points-gd-gf-v1" as const;

export interface CompetitionStandingRow {
  readonly position: number;
  readonly teamId: TeamId;
  readonly played: number;
  readonly wins: number;
  readonly draws: number;
  readonly losses: number;
  readonly goalsFor: number;
  readonly goalsAgainst: number;
  readonly goalDifference: number;
  readonly points: number;
}

export interface CompetitionStandingSnapshot {
  readonly competitionId: CompetitionId;
  readonly organizationId: OrganizationId;
  readonly formulaVersion: typeof COMPETITION_STANDING_FORMULA_VERSION;
  readonly rows: readonly CompetitionStandingRow[];
  readonly sourceRevisionMax: number;
  readonly updatedAt: Date;
}
