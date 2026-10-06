import {
  EncounterNotFound,
  type AssociateEncounterCandidatesError,
  type AssociateEncounterCandidatesOutput,
  type RecalculateEncounterCandidatesUseCase,
} from "@futrob/results";
import type {
  AppliedScheduleChange,
  ScheduleChangeApplicationFeedCursor,
  ScheduleChangeApplicationFeedPort,
} from "@futrob/scheduling";
import { err, ok, type ClockPort, type Result } from "@futrob/shared-kernel";

export type CandidateRecalculationOutcome =
  | AssociateEncounterCandidatesOutput["status"]
  | "encounter_not_found";

export interface CandidateRecalculationCheckpoint {
  readonly application: AppliedScheduleChange;
  readonly outcome: CandidateRecalculationOutcome;
  readonly recalculatedAt: Date;
}

export interface CandidateRecalculationCheckpointPort {
  latestAppliedAt(): Promise<Date | null>;
  listRecorded(applicationIds: readonly string[]): Promise<ReadonlySet<string>>;
  /** Recording the same application again keeps the first row. */
  record(checkpoint: CandidateRecalculationCheckpoint): Promise<void>;
}

/**
 * An application commits after its `appliedAt` is read, so one can become visible behind
 * the checkpoint. Each run rescans this span; recorded applications are skipped.
 */
export const RESCHEDULE_HANDOFF_RESCAN_MS = 10 * 60 * 1_000;
const PAGE_SIZE = 50;

/**
 * Consumes the schedule change handoff and recalculates the candidates of each rescheduled
 * Encounter from its stored slot starts. It never applies a schedule, selects or approves.
 * A transient failure stops the run before its checkpoint, so the next run retries it.
 */
export class RecalculateRescheduledCandidates {
  constructor(
    private readonly deps: {
      readonly feed: ScheduleChangeApplicationFeedPort;
      readonly checkpoints: CandidateRecalculationCheckpointPort;
      readonly recalculate: Pick<RecalculateEncounterCandidatesUseCase, "execute">;
      readonly clock: ClockPort;
    },
  ) {}

  async execute(): Promise<
    Result<{ readonly recalculated: number }, AssociateEncounterCandidatesError>
  > {
    const latest = await this.deps.checkpoints.latestAppliedAt();
    let after: ScheduleChangeApplicationFeedCursor | null = latest
      ? {
          appliedAt: new Date(latest.getTime() - RESCHEDULE_HANDOFF_RESCAN_MS),
          applicationId: "",
        }
      : null;
    let recalculated = 0;
    for (;;) {
      const page = await this.deps.feed.listAppliedAfter({ after, limit: PAGE_SIZE });
      const recorded = await this.deps.checkpoints.listRecorded(
        page.map((application) => application.applicationId),
      );
      for (const application of page) {
        if (recorded.has(application.applicationId)) continue;
        const result = await this.deps.recalculate.execute({
          organizationId: application.organizationId,
          encounterId: application.encounterId,
        });
        if (result.isErr() && !EncounterNotFound.is(result.error)) return err(result.error);
        await this.deps.checkpoints.record({
          application,
          outcome: result.isOk() ? result.value.status : "encounter_not_found",
          recalculatedAt: this.deps.clock.now(),
        });
        recalculated += 1;
      }
      const last = page.at(-1);
      if (!last || page.length < PAGE_SIZE) return ok({ recalculated });
      after = { appliedAt: last.appliedAt, applicationId: last.applicationId };
    }
  }
}
