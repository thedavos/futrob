import type {
  ScheduleChangeCreationOptionsDto,
  ScheduleChangeRequestDto,
} from "@futrob/api-contracts";
import { describe, expect, it } from "vite-plus/test";
import { FutrobApiError } from "../errors.ts";
import {
  blockedScheduleChangeReasons,
  canResolveScheduleChange,
  competitionWallTimeFields,
  competitionWallTimeInstant,
  counterProposalTeamId,
  isScheduleChangeDraftStale,
  offeredScheduleChangeResponses,
  parseCompetitionWallTime,
  scheduleChangeCreationBlocks,
  scheduleChangeRecovery,
  scheduleChangeResolutionFailure,
  scheduleChangeSummary,
} from "./index.ts";

const encounter = {
  home: { teamId: "team-home", name: "Home" },
  away: { teamId: "team-away", name: "Away" },
  scheduledStartAt: "2026-11-05T01:00:00.000Z",
  officialMatches: [
    { officialSlot: 1 as const, scheduledStartAt: "2026-11-05T01:00:00.000Z" },
    { officialSlot: 2 as const, scheduledStartAt: "2026-11-05T02:00:00.000Z" },
  ],
};

function openRequest(overrides: Partial<ScheduleChangeRequestDto> = {}): ScheduleChangeRequestDto {
  return {
    id: "request-1",
    organizationId: "org-1",
    competitionId: "competition-1",
    encounterId: "encounter-1",
    requestingTeamId: "team-home",
    initiatedByActorId: "captain-home",
    scope: { type: "entire_encounter" },
    status: "open",
    version: 1,
    currentProposalId: "proposal-1",
    proposals: [
      {
        id: "proposal-1",
        proposedStartAt: "2026-11-06T01:00:00.000Z",
        proposedByActorId: "captain-home",
        proposedByTeamId: "team-home",
        reason: "Squad availability",
        createdAt: "2026-11-01T08:00:00.000Z",
        responseDeadline: "2026-11-02T08:00:00.000Z",
      },
    ],
    decisions: [],
    actions: [],
    allowedActions: ["accept", "reject", "counter"],
    respondAs: { authority: "rival_team", teamId: "team-away" },
    blockedActions: [],
    application: null,
    createdAt: "2026-11-01T08:00:00.000Z",
    updatedAt: "2026-11-01T08:00:00.000Z",
    ...overrides,
  };
}

function apiError(status: number, code: string, anchor?: "current" | "proposed") {
  return new FutrobApiError({
    status,
    body: { code, messageKey: `errors.${code}`, ...(anchor ? { details: { anchor } } : {}) },
  });
}

describe("competition wall time", () => {
  it("parses the fields as written and rejects impossible dates and times", () => {
    expect(parseCompetitionWallTime({ date: "2026-11-20", time: "21:30" })).toEqual({
      year: 2026,
      month: 11,
      day: 20,
      hour: 21,
      minute: 30,
      second: 0,
    });
    expect(parseCompetitionWallTime({ date: "2026-02-30", time: "21:30" })).toBeNull();
    expect(parseCompetitionWallTime({ date: "2026-11-20", time: "24:00" })).toBeNull();
    expect(parseCompetitionWallTime({ date: "20/11/2026", time: "21:30" })).toBeNull();
  });

  it("converts through the competition zone, not the device's", () => {
    const wallTime = parseCompetitionWallTime({ date: "2026-11-20", time: "21:30" })!;
    expect(competitionWallTimeInstant(wallTime, "America/Mexico_City")).toBe(
      "2026-11-21T03:30:00.000Z",
    );
    expect(competitionWallTimeFields("2026-11-21T03:30:00.000Z", "America/Mexico_City")).toEqual({
      date: "2026-11-20",
      time: "21:30",
    });
  });

  it("refuses a local time inside a daylight-saving gap and an unknown zone", () => {
    const gap = parseCompetitionWallTime({ date: "2026-03-29", time: "02:30" })!;
    expect(competitionWallTimeInstant(gap, "Europe/Madrid")).toBeNull();
    expect(competitionWallTimeInstant(gap, "Mars/Olympus")).toBeNull();
  });
});

describe("schedule change model", () => {
  it("summarizes pending, applied and closed requests", () => {
    expect(scheduleChangeSummary(openRequest(), encounter)).toEqual({
      kind: "pending",
      from: encounter.scheduledStartAt,
      to: "2026-11-06T01:00:00.000Z",
    });
    expect(
      scheduleChangeSummary(
        openRequest({ scope: { type: "official_match", officialSlot: 2 } }),
        encounter,
      ),
    ).toMatchObject({ kind: "pending", from: "2026-11-05T02:00:00.000Z" });
    expect(scheduleChangeSummary(openRequest({ status: "rejected" }), encounter)).toEqual({
      kind: "closed",
      to: "2026-11-06T01:00:00.000Z",
    });
    expect(
      scheduleChangeSummary(
        openRequest({
          status: "accepted",
          application: {
            id: "application-1",
            proposalId: "proposal-1",
            requestVersion: 2,
            appliedByActorId: "captain-away",
            previousEncounterStartAt: "2026-11-04T01:00:00.000Z",
            appliedEncounterStartAt: "2026-11-06T01:00:00.000Z",
            slots: [
              {
                officialSlot: 1,
                previousStartAt: "2026-11-04T01:00:00.000Z",
                appliedStartAt: "2026-11-06T01:00:00.000Z",
              },
            ],
            appliedAt: "2026-11-01T09:00:00.000Z",
          },
        }),
        encounter,
      ),
    ).toEqual({
      kind: "applied",
      from: "2026-11-04T01:00:00.000Z",
      to: "2026-11-06T01:00:00.000Z",
    });
  });

  it("explains why no request can be created", () => {
    const open: ScheduleChangeCreationOptionsDto = {
      blockedReason: null,
      teams: [{ teamId: "team-home", blockedReason: null }],
      scopes: [
        {
          scope: { type: "entire_encounter" },
          currentStartAt: encounter.scheduledStartAt,
          blockedReason: null,
        },
      ],
    };
    expect(scheduleChangeCreationBlocks(open)).toEqual([]);
    expect(
      scheduleChangeCreationBlocks({ blockedReason: "permission", teams: [], scopes: [] }),
    ).toEqual([{ reason: "permission" }]);
    expect(scheduleChangeCreationBlocks({ ...open, blockedReason: null, teams: [] })).toEqual([
      { reason: "permission" },
    ]);
    expect(
      scheduleChangeCreationBlocks({
        ...open,
        teams: [{ teamId: "team-home", blockedReason: "limit_reached" }],
      }),
    ).toEqual([{ reason: "limit_reached", teamId: "team-home" }]);
    expect(
      scheduleChangeCreationBlocks({
        ...open,
        scopes: [
          { ...open.scopes[0]!, blockedReason: "active_request_exists" },
          {
            scope: { type: "official_match", officialSlot: 1 },
            currentStartAt: encounter.scheduledStartAt,
            blockedReason: "active_request_exists",
          },
        ],
      }),
    ).toEqual([{ reason: "active_request_exists" }]);
  });

  it("offers only the responses the server allows, and only while the request is open", () => {
    const request = openRequest({
      allowedActions: ["counter"],
      blockedActions: [
        { action: "accept", reason: "own_proposal" },
        { action: "reject", reason: "own_proposal" },
      ],
    });
    expect(offeredScheduleChangeResponses(request)).toEqual(["counter"]);
    expect(blockedScheduleChangeReasons(request)).toEqual(["own_proposal"]);
    expect(offeredScheduleChangeResponses(openRequest({ status: "escalated" }))).toEqual([]);
    expect(
      blockedScheduleChangeReasons(
        openRequest({ blockedActions: [{ action: "accept", reason: "request_closed" }] }),
      ),
    ).toEqual([]);
    expect(counterProposalTeamId(openRequest(), encounter)).toBe("team-away");
  });

  it("lets the organizer resolve only an escalated request the server allows", () => {
    expect(
      canResolveScheduleChange(openRequest({ status: "escalated", allowedActions: ["resolve"] })),
    ).toBe(true);
    expect(canResolveScheduleChange(openRequest({ status: "escalated", allowedActions: [] }))).toBe(
      false,
    );
    expect(canResolveScheduleChange(openRequest({ allowedActions: ["resolve"] }))).toBe(false);
  });

  it("marks a draft stale when the request moved on", () => {
    const request = openRequest({ version: 2 });
    expect(
      isScheduleChangeDraftStale(request, { proposalId: "proposal-1", version: 2 }, "accept"),
    ).toBe(false);
    expect(
      isScheduleChangeDraftStale(request, { proposalId: "proposal-1", version: 1 }, "accept"),
    ).toBe(true);
    expect(
      isScheduleChangeDraftStale(
        openRequest({ version: 2, allowedActions: ["counter"] }),
        { proposalId: "proposal-1", version: 2 },
        "accept",
      ),
    ).toBe(true);
  });
});

describe("schedule change recovery", () => {
  it("keeps a draft with a fixable date and closes one the server will not take", () => {
    expect(
      scheduleChangeRecovery(
        apiError(422, "scheduling.reschedule_notice_not_met", "proposed"),
        "counter",
      ),
    ).toEqual({
      draft: "keep",
      field: "date",
      message: "noticeProposed",
      code: "scheduling.reschedule_notice_not_met",
    });
    expect(
      scheduleChangeRecovery(
        apiError(422, "scheduling.reschedule_notice_not_met", "current"),
        "create",
      ),
    ).toMatchObject({ draft: "close", message: "noticeCurrent" });
    expect(
      scheduleChangeRecovery(apiError(422, "scheduling.invalid_schedule_change_date"), "accept"),
    ).toMatchObject({ draft: "close", message: "acceptPast" });
    expect(
      scheduleChangeRecovery(
        apiError(409, "scheduling.schedule_change_version_conflict"),
        "reject",
      ),
    ).toMatchObject({ draft: "close", message: "review" });
    expect(
      scheduleChangeRecovery(apiError(403, "authorization.forbidden"), "create"),
    ).toMatchObject({ draft: "close", message: "permission" });
  });

  it("keeps the draft for a dropped connection or an unknown code", () => {
    expect(scheduleChangeRecovery(null, "create")).toEqual({
      draft: "keep",
      field: null,
      message: "network",
      code: null,
    });
    expect(scheduleChangeRecovery(apiError(500, "api.unavailable"), "create")).toMatchObject({
      draft: "keep",
      message: "unknown",
      code: "api.unavailable",
    });
  });

  it("reads any resolution conflict as a request to review", () => {
    expect(
      scheduleChangeResolutionFailure(apiError(409, "scheduling.schedule_change_proposal_stale")),
    ).toEqual({ message: "review", code: "scheduling.schedule_change_proposal_stale" });
    expect(scheduleChangeResolutionFailure(null)).toEqual({
      message: "network",
      code: null,
    });
  });
});
