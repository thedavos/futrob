import type { EncounterOpenSelectionPort } from "@futrob/scheduling";

/** Scheduling is composed before results; results binds the selection side afterwards. */
export class DeferredEncounterOpenSelectionPort implements EncounterOpenSelectionPort {
  private target: EncounterOpenSelectionPort | null = null;

  bind(target: EncounterOpenSelectionPort): void {
    if (this.target) throw new Error("EncounterOpenSelectionPort is already bound");
    this.target = target;
  }

  cancelOpen(input: Parameters<EncounterOpenSelectionPort["cancelOpen"]>[0]) {
    if (!this.target) throw new Error("EncounterOpenSelectionPort has not been bound");
    return this.target.cancelOpen(input);
  }
}
