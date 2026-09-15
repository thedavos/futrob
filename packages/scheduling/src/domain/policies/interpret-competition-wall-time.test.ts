import { asActorId, asTeamId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { createScheduleChangeProposal } from "../entities/schedule-change-proposal.ts";
import { InvalidScheduleChangeDate } from "../errors/schedule-change-request.errors.ts";
import { interpretCompetitionWallTime } from "./interpret-competition-wall-time.ts";

describe("interpretCompetitionWallTime", () => {
  // HTTP POST for schedule-change is not on the product API yet — skipped.
  // minimumRescheduleNoticeHours is not on CompetitionRescheduleRulesPort — skipped.
  // Write-path spring-forward rejection lives on CreateScheduleChangeRequestUseCase.

  it("proposal proposedStartAt equals UTC epoch for competition wall time", () => {
    const interpreted = interpretCompetitionWallTime({
      timeZone: "America/Lima",
      wallTime: { year: 2026, month: 9, day: 21, hour: 16, minute: 30, second: 0 },
    });
    expect(interpreted.isOk()).toBe(true);
    if (interpreted.isErr()) return;

    const proposal = createScheduleChangeProposal({
      id: "proposal-1",
      proposedStartAt: interpreted.value,
      currentStartAt: new Date("2026-09-20T20:00:00.000Z"),
      proposedByActorId: asActorId("captain-1"),
      proposedByTeamId: asTeamId("team-home"),
      reason: "Travel conflict",
      now: new Date("2026-09-14T20:00:00.000Z"),
    });

    expect(proposal.isOk()).toBe(true);
    if (proposal.isErr()) return;
    expect(interpreted.value.toISOString()).toBe("2026-09-21T21:30:00.000Z");
    expect(proposal.value.proposedStartAt.getTime()).toBe(Date.parse("2026-09-21T21:30:00.000Z"));
  });

  it("local wall time that does not exist (spring-forward) invalid", () => {
    const interpreted = interpretCompetitionWallTime({
      timeZone: "America/New_York",
      wallTime: { year: 2026, month: 3, day: 8, hour: 2, minute: 30, second: 0 },
    });
    expect(interpreted.isErr()).toBe(true);
    if (interpreted.isOk()) return;
    expect(interpreted.error).toBeInstanceOf(InvalidScheduleChangeDate);
    expect(interpreted.error.code).toBe("scheduling.invalid_schedule_change_date");
  });
});
