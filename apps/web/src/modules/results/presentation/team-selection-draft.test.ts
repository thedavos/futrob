import { describe, expect, it } from "vite-plus/test";
import type { OfficialSelectionViewDto } from "@futrob/api-contracts";
import type { SlotSelection } from "./encounter-preview.ts";
import { beginAttempt, type Attempt } from "./selection-draft.ts";
import {
  buildTeamIntent,
  EMPTY_TEAM_DRAFT,
  teamCommandsFor,
  teamDraftReducer,
  type TeamDraft,
  type TeamDraftEvent,
  type TeamIntent,
} from "./team-selection-draft.ts";

const reject: Attempt<TeamIntent> = {
  intent: { kind: "reject", proposalId: "proposal-1", reason: "Slot 2 was a friendly" },
  expectedVersion: 1,
  commandKey: "key-a",
};

const run = (...events: TeamDraftEvent[]): TeamDraft =>
  events.reduce(teamDraftReducer, EMPTY_TEAM_DRAFT);

const typedReject = (): TeamDraft =>
  run(
    { type: "assign", slot: 1, key: "ea-clubs:m-1" },
    { type: "open", command: "reject" },
    { type: "edit_reason", command: "reject", text: "Slot 2 was a friendly" },
    { type: "started", attempt: reject },
  );

describe("Team selection draft", () => {
  it("does not start a second attempt while one is pending", () => {
    const draft = typedReject();
    expect(draft.submission).toEqual({ status: "pending", attempt: reject });
    expect(beginAttempt(draft.submission, reject.intent, 1, "key-b")).toBeNull();
    expect(teamDraftReducer(draft, { type: "close" }).open).toBe("reject");
  });

  it("replays an unknown outcome with the same key and version; a changed reason gets a new key", () => {
    const draft = teamDraftReducer(typedReject(), {
      type: "settled",
      outcome: { ok: false, failure: "unknown", code: null },
    });
    expect(beginAttempt(draft.submission, reject.intent, 4, "key-b")).toEqual(reject);
    expect(
      beginAttempt(
        draft.submission,
        { kind: "reject", proposalId: "proposal-1", reason: "Slot 2 was a friendly match" },
        4,
        "key-b",
      ),
    ).toEqual({
      intent: { kind: "reject", proposalId: "proposal-1", reason: "Slot 2 was a friendly match" },
      expectedVersion: 4,
      commandKey: "key-b",
    });
  });

  it("keeps the unknown attempt across closing so reopening replays it", () => {
    const draft = run(
      { type: "open", command: "reject" },
      { type: "started", attempt: reject },
      { type: "settled", outcome: { ok: false, failure: "unknown", code: null } },
      { type: "close" },
      { type: "open", command: "reject" },
    );
    expect(beginAttempt(draft.submission, reject.intent, 1, "key-b")?.commandKey).toBe("key-a");
  });

  it("after a conflict keeps the typed reason and slot choices and sends the next submit fresh", () => {
    const draft = teamDraftReducer(typedReject(), {
      type: "settled",
      outcome: { ok: false, failure: "conflict", code: "results.selection_version_conflict" },
    });
    expect(draft.submission).toEqual({ status: "conflict", readVersion: 1 });
    expect(draft.open).toBe("reject");
    expect(draft.input.reasons.reject).toBe("Slot 2 was a friendly");
    expect(draft.input.assignments).toEqual({ 1: "ea-clubs:m-1", 2: null });
    expect(beginAttempt(draft.submission, reject.intent, 2, "key-b")).toEqual({
      ...reject,
      expectedVersion: 2,
      commandKey: "key-b",
    });
  });

  it("clears the draft and announces the command on success", () => {
    const draft = teamDraftReducer(typedReject(), { type: "settled", outcome: { ok: true } });
    expect(draft).toEqual({ ...EMPTY_TEAM_DRAFT, accepted: "reject" });
  });

  it("closes and stops sending once the server refuses the actor", () => {
    const draft = teamDraftReducer(typedReject(), {
      type: "settled",
      outcome: { ok: false, failure: "refused", code: "results.official_selection_forbidden" },
    });
    expect(draft.open).toBeNull();
    expect(beginAttempt(draft.submission, reject.intent, 1, "key-b")).toBeNull();
    expect(teamDraftReducer(draft, { type: "open", command: "reject" }).open).toBeNull();
  });

  it("requires every official slot for a proposal and a nonblank reason for a rejection", () => {
    const m1: SlotSelection = {
      officialSlot: 1,
      providerMatchRef: { providerKey: "ea-clubs", externalId: "m-1" },
    };
    expect(buildTeamIntent("propose", { proposalId: null, selections: null, reason: "" })).toEqual({
      ok: false,
      missing: "slots",
    });
    expect(buildTeamIntent("propose", { proposalId: null, selections: [m1], reason: "" })).toEqual({
      ok: true,
      intent: { kind: "propose", selections: [m1] },
    });
    expect(
      buildTeamIntent("reject", { proposalId: "proposal-1", selections: null, reason: "   " }),
    ).toEqual({ ok: false, missing: "reason" });
    expect(
      buildTeamIntent("reject", { proposalId: "proposal-1", selections: null, reason: " Late " }),
    ).toEqual({ ok: true, intent: { kind: "reject", proposalId: "proposal-1", reason: "Late" } });
  });
});

describe("team commands", () => {
  const pending = (
    proposingTeamId: string,
    allowedActions: OfficialSelectionViewDto["allowedActions"],
  ): OfficialSelectionViewDto => ({
    encounterId: "encounter-1",
    selection: {
      id: "selection-1",
      encounterId: "encounter-1",
      organizationId: "org-1",
      competitionId: "competition-1",
      status: "awaiting_opponent_confirmation",
      version: 1,
      round: 1,
      currentProposalId: "proposal-1",
      createdAt: "2026-09-17T03:00:00.000Z",
      updatedAt: "2026-09-17T03:00:00.000Z",
    },
    proposals: [
      {
        id: "proposal-1",
        round: 1,
        sequence: 1,
        proposingTeamId,
        proposedByActorId: "actor-home",
        slots: [
          { officialSlot: 1, providerMatchRef: { providerKey: "ea-clubs", externalId: "m-1" } },
        ],
        supersedesProposalId: null,
        reason: null,
        createdAt: "2026-09-17T03:00:00.000Z",
        confirmationDeadline: "2026-09-18T03:00:00.000Z",
      },
    ],
    actions: [],
    disputes: [],
    activeDispute: null,
    approvedResultId: null,
    integrityFlags: [],
    allowedActions,
  });
  const all = ["confirm", "reject", "propose_alternative", "open_dispute", "void"] as const;

  it("never offers the proposing Team an answer to its own proposal, even when served", () => {
    expect(teamCommandsFor(pending("team-home", [...all]), "team-home")).toEqual(["open_dispute"]);
    expect(teamCommandsFor(pending("team-home", [...all]), "team-away")).toEqual([
      "confirm",
      "reject",
      "propose_alternative",
      "open_dispute",
    ]);
  });

  it("offers nothing the server did not allow", () => {
    expect(teamCommandsFor(pending("team-home", []), "team-away")).toEqual([]);
  });
});
