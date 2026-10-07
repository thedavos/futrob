import type { ActorId } from "@futrob/shared-kernel";
import type { OfficialMatchScheduleChange } from "../policies/official-match-schedule.ts";
import type { ScheduleChangeTransition } from "./schedule-change-request.ts";

/**
 * Append-only record of the schedule an accepted request applied, written in the same
 * transaction as the slot starts. A request has at most one. It is also the durable
 * handoff for candidate recalculation; each consumer acknowledges what it handled.
 */
export interface ScheduleChangeApplication {
  readonly id: string;
  readonly proposalId: string;
  /** The request version produced by the consent that completed the approvals. */
  readonly requestVersion: number;
  readonly appliedByActorId: ActorId;
  readonly previousEncounterStartAt: Date;
  readonly appliedEncounterStartAt: Date;
  /** Only the slots whose start moved. */
  readonly slots: readonly OfficialMatchScheduleChange[];
  readonly appliedAt: Date;
}

/** Attaches the schedule an accepting transition applies, so both commit together. */
export function withAppliedSchedule(
  transition: ScheduleChangeTransition,
  application: ScheduleChangeApplication,
): ScheduleChangeTransition {
  return {
    ...transition,
    appendedApplication: application,
    request: { ...transition.request, application },
  };
}
