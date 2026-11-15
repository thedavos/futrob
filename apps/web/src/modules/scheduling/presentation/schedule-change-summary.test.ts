import type { ScheduleChangeRequestDto } from "@futrob/api-contracts";
import { describe, expect, it } from "vite-plus/test";
import { encounterView } from "@/modules/results/presentation/encounter-page.fixtures.ts";
import { openScheduleChange } from "./schedule-changes.fixtures.ts";
import { scheduleChangeSummary } from "./schedule-change-summary.ts";

const T1 = "2026-09-14T01:00:00.000Z";
const T2 = "2026-10-11T20:00:00.000Z";
const T3 = "2026-10-18T20:00:00.000Z";

function applied(
  from: string,
  to: string,
  overrides: Partial<ScheduleChangeRequestDto> = {},
): ScheduleChangeRequestDto {
  return openScheduleChange({
    status: "accepted",
    allowedActions: [],
    application: {
      id: "application-1",
      proposalId: "proposal-1",
      requestVersion: 2,
      appliedByActorId: "captain-away",
      previousEncounterStartAt: from,
      appliedEncounterStartAt: to,
      slots: [{ officialSlot: 1, previousStartAt: from, appliedStartAt: to }],
      appliedAt: "2026-09-02T15:00:00.000Z",
    },
    ...overrides,
  });
}

describe("scheduleChangeSummary", () => {
  it("moves an undecided request from the live kickoff", () => {
    expect(
      scheduleChangeSummary(openScheduleChange(), encounterView({ scheduledStartAt: T1 })),
    ).toEqual({ kind: "pending", from: T1, to: T2 });
  });

  it("keeps the accepted change after the encounter is refetched at its new kickoff", () => {
    expect(scheduleChangeSummary(applied(T1, T2), encounterView({ scheduledStartAt: T2 }))).toEqual(
      { kind: "applied", from: T1, to: T2 },
    );
  });

  it("does not rewrite an earlier change when a later one moves the encounter again", () => {
    const view = encounterView({ scheduledStartAt: T3 });
    const first = applied(T1, T2);
    const second = applied(T2, T3, { id: "request-2" });

    expect(scheduleChangeSummary(first, view)).toEqual({ kind: "applied", from: T1, to: T2 });
    expect(scheduleChangeSummary(second, view)).toEqual({ kind: "applied", from: T2, to: T3 });
  });

  it("reads a moved match from its own slot", () => {
    const request = applied(T1, T2, { scope: { type: "official_match", officialSlot: 1 } });

    expect(scheduleChangeSummary(request, encounterView({ scheduledStartAt: T2 }))).toEqual({
      kind: "applied",
      from: T1,
      to: T2,
    });
  });

  it("states no origin for a request that closed without moving anything", () => {
    const rejected = openScheduleChange({ status: "rejected", allowedActions: [] });

    expect(scheduleChangeSummary(rejected, encounterView({ scheduledStartAt: T3 }))).toEqual({
      kind: "closed",
      to: T2,
    });
  });
});
