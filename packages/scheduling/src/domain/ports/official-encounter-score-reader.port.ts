import type { CompetitionId, EncounterId, OrganizationId } from "@futrob/shared-kernel";

/**
 * Approved OfficialResult score as scheduling reads it. Slot `homeGoals` belong to the
 * Encounter home Team, the same orientation statistics uses for standings.
 */
export interface OfficialEncounterScore {
  readonly officialResultId: string;
  readonly revision: number;
  readonly slots: readonly {
    readonly officialSlot: 1 | 2;
    readonly homeGoals: number;
    readonly awayGoals: number;
  }[];
}

export interface OfficialEncounterScoreReaderPort {
  /** Currently approved score per Encounter; voided results are absent. */
  listApproved(input: {
    readonly organizationId: OrganizationId;
    readonly competitionId: CompetitionId;
  }): Promise<ReadonlyMap<EncounterId, OfficialEncounterScore>>;
}
