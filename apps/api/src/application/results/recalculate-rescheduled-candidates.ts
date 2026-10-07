import {
  EncounterNotFound,
  type AssociateEncounterCandidatesError,
  type RecalculateEncounterCandidatesUseCase,
} from "@futrob/results";
import type { ScheduleChangeApplicationFeedPort } from "@futrob/scheduling";
import { err, ok, type ClockPort, type Result } from "@futrob/shared-kernel";

export const CANDIDATE_RECALCULATION_CONSUMER = "results.candidate-recalculation";
const PAGE_SIZE = 50;

/**
 * Consumes the schedule change handoff and recalculates the candidates of each rescheduled
 * Encounter from its stored slot starts. It never applies a schedule, selects or approves.
 * An application is acknowledged only after its recalculation converged or its Encounter is
 * gone; a transient failure or crash leaves it unacknowledged for the next run.
 */
export class RecalculateRescheduledCandidates {
  constructor(
    private readonly deps: {
      readonly feed: ScheduleChangeApplicationFeedPort;
      readonly recalculate: Pick<RecalculateEncounterCandidatesUseCase, "execute">;
      readonly clock: ClockPort;
    },
  ) {}

  async execute(): Promise<
    Result<{ readonly recalculated: number }, AssociateEncounterCandidatesError>
  > {
    let recalculated = 0;
    for (;;) {
      const page = await this.deps.feed.listUnacknowledged({
        consumer: CANDIDATE_RECALCULATION_CONSUMER,
        limit: PAGE_SIZE,
      });
      for (const application of page) {
        const result = await this.deps.recalculate.execute({
          organizationId: application.organizationId,
          encounterId: application.encounterId,
        });
        if (result.isErr() && !EncounterNotFound.is(result.error)) return err(result.error);
        await this.deps.feed.acknowledge({
          consumer: CANDIDATE_RECALCULATION_CONSUMER,
          applicationId: application.applicationId,
          acknowledgedAt: this.deps.clock.now(),
        });
        recalculated += 1;
      }
      if (page.length < PAGE_SIZE) return ok({ recalculated });
    }
  }
}
