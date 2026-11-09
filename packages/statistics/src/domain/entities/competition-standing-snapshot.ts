import type { CompetitionId, OrganizationId, TeamId } from "@futrob/shared-kernel";

export const COMPETITION_STANDING_FORMULA_VERSION = "points-gd-gf-v1" as const;

/** Applied on read over the snapshot above; a stored snapshot never carries it (ADR-0027). */
export const COMPETITION_STANDING_SWISS_FORMULA_VERSION = "swiss-points-buchholz-gd-gf-v1" as const;

export const STANDING_FORM_LENGTH = 5;

export type StandingFormResult = "win" | "draw" | "loss";

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
  /** Latest official results, oldest first, at most `STANDING_FORM_LENGTH`. */
  readonly form: readonly StandingFormResult[];
  /** Swiss only. `points` above already include the bye credit. */
  readonly swiss?: {
    readonly buchholz: number;
    readonly byes: number;
    readonly withdrawn: boolean;
  };
}

export interface CompetitionStandingSnapshot {
  readonly competitionId: CompetitionId;
  readonly organizationId: OrganizationId;
  readonly formulaVersion: typeof COMPETITION_STANDING_FORMULA_VERSION;
  readonly rows: readonly CompetitionStandingRow[];
  readonly sourceRevisionMax: number;
  readonly updatedAt: Date;
}
