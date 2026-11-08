import type { CancelOpenSelectionUseCase, OfficialSelectionCommandOutput } from "@futrob/results";
import type { EncounterOpenSelectionPort } from "@futrob/scheduling";
import type { ActorId } from "@futrob/shared-kernel";

/**
 * Closes the cancelled proposal and dispute in the activity feed like any selection command, so
 * no pending item points at an Encounter that will not be played. Throws so the surrounding
 * transaction undoes the fixture change as well.
 */
export class ResultsOpenSelectionAdapter implements EncounterOpenSelectionPort {
  constructor(
    private readonly results: {
      readonly cancelOpenSelection: Pick<CancelOpenSelectionUseCase, "execute">;
    },
    private readonly activity: {
      project(output: OfficialSelectionCommandOutput, actorId: ActorId): Promise<void>;
    },
  ) {}

  async cancelOpen(input: Parameters<EncounterOpenSelectionPort["cancelOpen"]>[0]): Promise<void> {
    const cancelled = await this.results.cancelOpenSelection.execute(input);
    if (cancelled.isErr()) throw cancelled.error;
    if (cancelled.value.status === "voided") {
      await this.activity.project(cancelled.value.output, input.actorId);
    }
  }
}
