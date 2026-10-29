import type {
  InvalidateEncounterCandidatesUseCase,
  RecalculateEncounterCandidatesUseCase,
} from "@futrob/results";
import type { EncounterParticipantsChangePort } from "@futrob/scheduling";

/**
 * Keeps official result candidates aligned with an advanced Encounter's Teams: withdraws
 * the eligibility of the previous pairing, then re-associates the current one when the
 * Encounter is still scheduled. A removed Encounter keeps only ineligible evidence.
 */
export class ResultsCandidateEligibilityAdapter implements EncounterParticipantsChangePort {
  constructor(
    private readonly results: {
      readonly invalidateEncounterCandidates: Pick<InvalidateEncounterCandidatesUseCase, "execute">;
      readonly recalculateEncounterCandidates: Pick<
        RecalculateEncounterCandidatesUseCase,
        "execute"
      >;
    },
  ) {}

  async participantsChanged(
    input: Parameters<EncounterParticipantsChangePort["participantsChanged"]>[0],
  ): Promise<void> {
    const invalidated = await this.results.invalidateEncounterCandidates.execute(input);
    if (!invalidated.isOk()) throw invalidated.error;
    const recalculated = await this.results.recalculateEncounterCandidates.execute(input);
    if (recalculated.isOk() || recalculated.error.code === "results.encounter_not_found") return;
    throw recalculated.error;
  }
}
