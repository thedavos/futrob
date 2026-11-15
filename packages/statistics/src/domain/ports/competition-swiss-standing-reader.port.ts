import type { CompetitionId, OrganizationId, TeamId } from "@futrob/shared-kernel";

export interface CompetitionSwissProgress {
  readonly roundsTotal: number;
  readonly roundsCompleted: number;
  /** Round still waiting for results; null when none is open. */
  readonly currentRound: number | null;
  /** Every remaining round is settled. */
  readonly isFinal: boolean;
}

export interface CompetitionSwissStandingContext extends CompetitionSwissProgress {
  readonly seed: readonly TeamId[];
  /** Rivals in encounters with an approved official result, one entry per encounter. */
  readonly opponentsByTeam: ReadonlyMap<TeamId, readonly TeamId[]>;
  readonly byesByTeam: ReadonlyMap<TeamId, number>;
  readonly withdrawnTeamIds: readonly TeamId[];
  readonly pointsPerBye: number;
}

export interface CompetitionSwissStandingReaderPort {
  /** Null unless the competition's current fixture is Swiss. */
  find(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
  ): Promise<CompetitionSwissStandingContext | null>;
}
