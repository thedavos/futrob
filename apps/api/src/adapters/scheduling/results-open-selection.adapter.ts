import type { CancelOpenSelectionUseCase } from "@futrob/results";
import type { EncounterOpenSelectionPort } from "@futrob/scheduling";

/** Throws so the surrounding transaction undoes the fixture change as well. */
export class ResultsOpenSelectionAdapter implements EncounterOpenSelectionPort {
  constructor(
    private readonly results: {
      readonly cancelOpenSelection: Pick<CancelOpenSelectionUseCase, "execute">;
    },
  ) {}

  async cancelOpen(input: Parameters<EncounterOpenSelectionPort["cancelOpen"]>[0]): Promise<void> {
    const cancelled = await this.results.cancelOpenSelection.execute(input);
    if (cancelled.isErr()) throw cancelled.error;
  }
}
