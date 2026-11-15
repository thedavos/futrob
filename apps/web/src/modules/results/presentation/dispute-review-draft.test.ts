import { describe, expect, it } from "vite-plus/test";
import {
  acknowledgementRequired,
  approvableProposals,
  buildOperatorIntent,
  EMPTY_OPERATOR_DRAFT,
  operatorCommandsFor,
  operatorDraftReducer,
  type OperatorDraft,
  type OperatorDraftEvent,
} from "./dispute-review-draft.ts";
import {
  disputeCase,
  m3Disconnected,
  resolvedByApproval,
  returnedToSelection,
  reviewCase,
} from "./official-selection.fixtures.ts";
import { beginAttempt } from "./selection-draft.ts";

const run = (...events: OperatorDraftEvent[]): OperatorDraft =>
  events.reduce(operatorDraftReducer, EMPTY_OPERATOR_DRAFT);

const idle = { status: "idle" } as const;

describe("operator decisions offered", () => {
  it("offers taking the case only when the server serves review_dispute", () => {
    expect(operatorCommandsFor(disputeCase(["review_dispute"]))).toEqual(["review_dispute"]);
    expect(operatorCommandsFor(disputeCase([]))).toEqual([]);
  });

  it("splits a served resolve_dispute into approve and return, and offers neither once approved", () => {
    expect(operatorCommandsFor(reviewCase())).toEqual(["approve_proposal", "return_to_selection"]);
    expect(operatorCommandsFor(resolvedByApproval())).toEqual([]);
  });

  it("approves only proposals of the current round", () => {
    expect(approvableProposals(reviewCase()).map((row) => row.id)).toEqual([
      "proposal-1",
      "proposal-2",
    ]);
    const nextRound = returnedToSelection();
    expect(approvableProposals(nextRound)).toEqual([]);
    expect(operatorCommandsFor({ ...nextRound, allowedActions: ["resolve_dispute"] })).toEqual([
      "return_to_selection",
    ]);
  });
});

describe("operator intents", () => {
  const view = reviewCase({ integrityFlags: m3Disconnected });

  it("needs a chosen proposal, then a reason, to approve one without flags", () => {
    expect(buildOperatorIntent("approve_proposal", view, EMPTY_OPERATOR_DRAFT.input, idle)).toEqual(
      { ok: false, missing: "proposal" },
    );
    const chosen = run({ type: "choose_proposal", proposalId: "proposal-1" }).input;
    expect(buildOperatorIntent("approve_proposal", view, chosen, idle)).toEqual({
      ok: false,
      missing: "reason",
    });
    const typed = run(
      { type: "choose_proposal", proposalId: "proposal-1" },
      { type: "edit_reason", command: "approve_proposal", text: "  Coincide con el horario  " },
    ).input;
    expect(buildOperatorIntent("approve_proposal", view, typed, idle)).toEqual({
      ok: true,
      intent: {
        kind: "approve_proposal",
        proposalId: "proposal-1",
        reason: "Coincide con el horario",
        acknowledgeIntegrityFlags: false,
      },
    });
  });

  it("blocks approving a flagged proposal until acknowledged, and only then sends the acknowledgement", () => {
    const typed = run(
      { type: "choose_proposal", proposalId: "proposal-2" },
      { type: "edit_reason", command: "approve_proposal", text: "Capturas revisadas" },
    );
    expect(acknowledgementRequired(view, typed.input, idle)).toBe(true);
    expect(buildOperatorIntent("approve_proposal", view, typed.input, idle)).toEqual({
      ok: false,
      missing: "acknowledgement",
    });
    const acknowledged = operatorDraftReducer(typed, { type: "acknowledge", acknowledged: true });
    expect(buildOperatorIntent("approve_proposal", view, acknowledged.input, idle)).toEqual({
      ok: true,
      intent: {
        kind: "approve_proposal",
        proposalId: "proposal-2",
        reason: "Capturas revisadas",
        acknowledgeIntegrityFlags: true,
      },
    });
  });

  it("drops the acknowledgement when the operator picks another proposal", () => {
    const draft = run(
      { type: "choose_proposal", proposalId: "proposal-2" },
      { type: "acknowledge", acknowledged: true },
      { type: "choose_proposal", proposalId: "proposal-1" },
    );
    expect(draft.input.acknowledged).toBe(false);
    expect(acknowledgementRequired(view, draft.input, idle)).toBe(false);
  });

  it("asks for the acknowledgement after the server refuses an approval without it", () => {
    const chosen = run({ type: "choose_proposal", proposalId: "proposal-1" }).input;
    const refused = {
      status: "invalid",
      code: "results.integrity_flags_not_acknowledged",
    } as const;
    expect(acknowledgementRequired(view, chosen, refused)).toBe(true);
    expect(acknowledgementRequired(view, chosen, { status: "invalid", code: null })).toBe(false);
  });

  it("requires a nonblank reason to take or return the case", () => {
    expect(buildOperatorIntent("review_dispute", view, EMPTY_OPERATOR_DRAFT.input, idle)).toEqual({
      ok: false,
      missing: "reason",
    });
    const typed = run({
      type: "edit_reason",
      command: "return_to_selection",
      text: " Fuera de hora ",
    });
    expect(buildOperatorIntent("return_to_selection", view, typed.input, idle)).toEqual({
      ok: true,
      intent: { kind: "return_to_selection", reason: "Fuera de hora" },
    });
  });
});

describe("operator submissions", () => {
  const approve = {
    intent: {
      kind: "approve_proposal",
      proposalId: "proposal-2",
      reason: "Capturas",
      acknowledgeIntegrityFlags: false,
    },
    expectedVersion: 4,
    commandKey: "key-a",
  } as const;

  it("replays an unknown approval with the same key and version, keeping the choice and reason", () => {
    const draft = run(
      { type: "choose_proposal", proposalId: "proposal-2" },
      { type: "edit_reason", command: "approve_proposal", text: "Capturas" },
      { type: "open", command: "approve_proposal" },
      { type: "started", attempt: approve },
      { type: "settled", outcome: { ok: false, failure: "unknown", code: null } },
    );
    expect(draft.input).toEqual({
      reasons: { review_dispute: "", approve_proposal: "Capturas", return_to_selection: "" },
      proposalId: "proposal-2",
      acknowledged: false,
    });
    expect(beginAttempt(draft.submission, approve.intent, 5, "key-b")).toEqual(approve);
  });

  it("after a conflict keeps the dialog and reason; the next submit uses the new version and key", () => {
    const draft = run(
      { type: "edit_reason", command: "review_dispute", text: "Tomo el caso" },
      { type: "open", command: "review_dispute" },
      {
        type: "started",
        attempt: {
          intent: { kind: "review_dispute", reason: "Tomo el caso" },
          expectedVersion: 3,
          commandKey: "key-a",
        },
      },
      {
        type: "settled",
        outcome: { ok: false, failure: "conflict", code: "results.selection_version_conflict" },
      },
    );
    expect(draft.open).toBe("review_dispute");
    expect(draft.input.reasons.review_dispute).toBe("Tomo el caso");
    expect(
      beginAttempt(
        draft.submission,
        { kind: "review_dispute", reason: "Tomo el caso" },
        4,
        "key-b",
      ),
    ).toEqual({
      intent: { kind: "review_dispute", reason: "Tomo el caso" },
      expectedVersion: 4,
      commandKey: "key-b",
    });
  });

  it("clears the choice, acknowledgement and reasons and announces the decision on success", () => {
    const draft = run(
      { type: "choose_proposal", proposalId: "proposal-2" },
      { type: "acknowledge", acknowledged: true },
      { type: "open", command: "approve_proposal" },
      { type: "started", attempt: approve },
      { type: "settled", outcome: { ok: true } },
    );
    expect(draft).toEqual({ ...EMPTY_OPERATOR_DRAFT, accepted: "approve_proposal" });
  });
});
