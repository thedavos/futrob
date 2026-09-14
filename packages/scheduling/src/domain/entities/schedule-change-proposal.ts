import { err, ok, type ActorId, type Result, type TeamId } from "@futrob/shared-kernel";
import {
  InvalidScheduleChangeDate,
  InvalidScheduleChangeReason,
} from "../errors/schedule-change-request.errors.ts";

export interface ScheduleChangeProposal {
  readonly id: string;
  readonly proposedStartAt: Date;
  readonly proposedByActorId: ActorId;
  readonly proposedByTeamId: TeamId;
  readonly reason: string;
  readonly createdAt: Date;
}

export interface CreateScheduleChangeProposalInput {
  readonly id: string;
  readonly proposedStartAt: Date;
  readonly currentStartAt: Date;
  readonly proposedByActorId: ActorId;
  readonly proposedByTeamId: TeamId;
  readonly reason: string;
  readonly now: Date;
}

export function createScheduleChangeProposal(
  input: CreateScheduleChangeProposalInput,
): Result<ScheduleChangeProposal, InvalidScheduleChangeDate | InvalidScheduleChangeReason> {
  const proposedTime = input.proposedStartAt.getTime();
  const nowTime = input.now.getTime();
  const currentTime = input.currentStartAt.getTime();
  if (
    !Number.isFinite(proposedTime) ||
    !Number.isFinite(nowTime) ||
    !Number.isFinite(currentTime) ||
    proposedTime <= nowTime ||
    proposedTime === currentTime
  ) {
    return err(
      new InvalidScheduleChangeDate({
        code: "scheduling.invalid_schedule_change_date",
        message: "The proposed start must be valid, future, and different from the current start",
      }),
    );
  }

  const reason = input.reason.trim();
  if (!reason) {
    return err(
      new InvalidScheduleChangeReason({
        code: "scheduling.invalid_schedule_change_reason",
        message: "A schedule change reason is required",
      }),
    );
  }

  return ok({
    id: input.id,
    proposedStartAt: new Date(proposedTime),
    proposedByActorId: input.proposedByActorId,
    proposedByTeamId: input.proposedByTeamId,
    reason,
    createdAt: new Date(nowTime),
  });
}
