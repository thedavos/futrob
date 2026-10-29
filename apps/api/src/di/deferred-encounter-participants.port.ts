import type { EncounterParticipantsChangePort } from "@futrob/scheduling";

/** Scheduling is composed before results; results binds the candidate side afterwards. */
export class DeferredEncounterParticipantsChangePort implements EncounterParticipantsChangePort {
  private target: EncounterParticipantsChangePort | null = null;

  bind(target: EncounterParticipantsChangePort): void {
    if (this.target) throw new Error("EncounterParticipantsChangePort is already bound");
    this.target = target;
  }

  participantsChanged(
    input: Parameters<EncounterParticipantsChangePort["participantsChanged"]>[0],
  ) {
    if (!this.target) throw new Error("EncounterParticipantsChangePort has not been bound");
    return this.target.participantsChanged(input);
  }
}
