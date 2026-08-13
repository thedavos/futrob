import type { CompetitionId, OrganizationId, TeamId } from "@futrob/shared-kernel";

export const RANKING_KINDS = ["scorer", "assister", "rating", "mvp", "goalkeeper"] as const;

export type RankingKind = (typeof RANKING_KINDS)[number];

export const RANKING_FORMULA_VERSION = "player-ranking-v1" as const;

export interface RankingEligibilityConfig {
  readonly minimumMatches: number;
  readonly minimumTeamMinutesRatio: number;
}

export const DEFAULT_RANKING_ELIGIBILITY: RankingEligibilityConfig = {
  minimumMatches: 3,
  minimumTeamMinutesRatio: 0.6,
};

export interface RankingRow {
  readonly position: number;
  readonly playerProfileId: string;
  readonly teamId: TeamId | null;
  readonly value: number;
  readonly matchesPlayed: number;
  readonly minutes: number;
}

export interface RankingSnapshot {
  readonly competitionId: CompetitionId;
  readonly organizationId: OrganizationId;
  readonly kind: RankingKind;
  readonly formulaVersion: typeof RANKING_FORMULA_VERSION;
  readonly eligibility: RankingEligibilityConfig;
  readonly rows: readonly RankingRow[];
  readonly sourceRevisionMax: number;
  readonly updatedAt: Date;
}
