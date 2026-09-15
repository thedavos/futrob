import { err, ok, type Result } from "@futrob/shared-kernel";
import { InvalidScheduleChangeDate } from "../errors/schedule-change-request.errors.ts";
import {
  instantForZonedParts,
  isIanaTimeZone,
  zonedParts,
  zonedPartsEqual,
  type ZonedParts,
} from "./zoned-instant.ts";

export type CompetitionWallTime = ZonedParts;

/**
 * Convert a competition-local wall clock to a UTC instant.
 * Persist the Date (UTC) plus the IANA id; never a pre-formatted local string.
 */
export function interpretCompetitionWallTime(input: {
  readonly wallTime: CompetitionWallTime;
  readonly timeZone: string;
}): Result<Date, InvalidScheduleChangeDate> {
  if (!isIanaTimeZone(input.timeZone)) {
    return err(invalidDate("The competition time zone must be a valid IANA identifier"));
  }

  const instant = instantForZonedParts(input.wallTime, input.timeZone);
  if (!Number.isFinite(instant.getTime())) {
    return err(invalidDate("The proposed start must be a valid UTC instant"));
  }

  const observed = zonedParts(instant, input.timeZone);
  if (!zonedPartsEqual(observed, input.wallTime)) {
    return err(
      invalidDate("The proposed local wall time does not exist in the competition time zone"),
    );
  }

  return ok(instant);
}

function invalidDate(message: string): InvalidScheduleChangeDate {
  return new InvalidScheduleChangeDate({
    code: "scheduling.invalid_schedule_change_date",
    message,
  });
}
