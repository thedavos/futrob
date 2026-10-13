import { err, ok, type Result } from "@futrob/shared-kernel";
import { RescheduleNoticeNotMet } from "../errors/schedule-change-request.errors.ts";
import type { RescheduleScope } from "../value-objects/reschedule-scope.ts";
import {
  rescheduleOfficialMatches,
  type OfficialMatchSchedule,
} from "./official-match-schedule.ts";

export function checkRescheduleMinimumNotice(input: {
  readonly scope: RescheduleScope;
  readonly schedules: readonly OfficialMatchSchedule[];
  readonly proposedStartAt: Date;
  readonly minimumNoticeHours: number;
  readonly now: Date;
}): Result<void, RescheduleNoticeNotMet> {
  if (input.minimumNoticeHours === 0) return ok(undefined);
  const now = input.now.getTime();
  const minimum = input.minimumNoticeHours * 3_600_000;
  const affected = (
    rescheduleOfficialMatches(input.scope, input.proposedStartAt, input.schedules) ?? []
  ).filter(
    (change) => input.scope.type === "entire_encounter" || change.slot === input.scope.officialSlot,
  );
  if (
    affected.some(
      ({ previousStartAt }) =>
        previousStartAt.getTime() > now && previousStartAt.getTime() - now < minimum,
    )
  ) {
    return err(noticeNotMet("current"));
  }
  if (
    input.proposedStartAt.getTime() - now < minimum ||
    affected.some(({ appliedStartAt }) => appliedStartAt.getTime() - now < minimum)
  ) {
    return err(noticeNotMet("proposed"));
  }
  return ok(undefined);
}

function noticeNotMet(anchor: "current" | "proposed"): RescheduleNoticeNotMet {
  return new RescheduleNoticeNotMet({
    code: "scheduling.reschedule_notice_not_met",
    message:
      anchor === "current"
        ? "The current schedule does not meet the minimum reschedule notice"
        : "The proposed schedule does not meet the minimum reschedule notice",
    anchor,
  });
}
