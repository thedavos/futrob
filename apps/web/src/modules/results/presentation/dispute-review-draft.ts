import type { OfficialSelectionViewDto } from "@futrob/api-contracts";
import {
  commandDraftReducer,
  emptyDraft,
  type CommandDraft,
  type CommandEvent,
  type Submission,
} from "./selection-draft.ts";

/**
 * What an operator can decide on a disputed selection. The server allows
 * `review_dispute` and `resolve_dispute`; resolving is two different decisions with
 * different consequences, so each gets its own dialog.
 */
export const OPERATOR_COMMANDS = [
  "review_dispute",
  "approve_proposal",
  "return_to_selection",
] as const;
export type OperatorCommand = (typeof OPERATOR_COMMANDS)[number];

const SERVED_AS = {
  review_dispute: "review_dispute",
  approve_proposal: "resolve_dispute",
  return_to_selection: "resolve_dispute",
} as const satisfies Record<OperatorCommand, OfficialSelectionViewDto["allowedActions"][number]>;

export type OperatorIntent =
  | { readonly kind: "review_dispute"; readonly reason: string }
  | {
      readonly kind: "approve_proposal";
      readonly proposalId: string;
      readonly reason: string;
      /** True only after the operator ticked the acknowledgement. */
      readonly acknowledgeIntegrityFlags: boolean;
    }
  | { readonly kind: "return_to_selection"; readonly reason: string };

export type OperatorInput = {
  readonly reasons: Readonly<Record<OperatorCommand, string>>;
  /** Proposal chosen for approval; nothing is preselected. */
  readonly proposalId: string | null;
  /** Acknowledges the integrity flags of the chosen proposal only. */
  readonly acknowledged: boolean;
};

export type OperatorEdit =
  | { readonly type: "edit_reason"; readonly command: OperatorCommand; readonly text: string }
  | { readonly type: "choose_proposal"; readonly proposalId: string }
  | { readonly type: "acknowledge"; readonly acknowledged: boolean };

export type OperatorDraft = CommandDraft<OperatorCommand, OperatorIntent, OperatorInput>;
export type OperatorDraftEvent = CommandEvent<OperatorCommand, OperatorIntent, OperatorEdit>;

const EMPTY_INPUT: OperatorInput = {
  reasons: { review_dispute: "", approve_proposal: "", return_to_selection: "" },
  proposalId: null,
  acknowledged: false,
};

export const EMPTY_OPERATOR_DRAFT: OperatorDraft = emptyDraft(EMPTY_INPUT);

export const operatorDraftReducer = commandDraftReducer<
  OperatorCommand,
  OperatorIntent,
  OperatorInput,
  OperatorEdit
>(EMPTY_INPUT, (input, edit) => {
  switch (edit.type) {
    case "edit_reason":
      return { ...input, reasons: { ...input.reasons, [edit.command]: edit.text } };
    case "choose_proposal":
      return edit.proposalId === input.proposalId
        ? input
        : { ...input, proposalId: edit.proposalId, acknowledged: false };
    case "acknowledge":
      return { ...input, acknowledged: edit.acknowledged };
    default: {
      const exhaustive: never = edit;
      return exhaustive;
    }
  }
});

/** Decisions to offer: only what the server allows, and approval only with something to approve. */
export function operatorCommandsFor(view: OfficialSelectionViewDto): readonly OperatorCommand[] {
  return OPERATOR_COMMANDS.filter(
    (command) =>
      view.allowedActions.includes(SERVED_AS[command]) &&
      (command !== "approve_proposal" || approvableProposals(view).length > 0),
  );
}

/** The server approves only proposals of the selection's current round. */
export function approvableProposals(view: OfficialSelectionViewDto) {
  const round = view.selection?.round;
  return view.proposals
    .filter((proposal) => proposal.round === round)
    .sort((a, b) => a.sequence - b.sequence);
}

/** Served integrity flags that concern one of the proposal's provider matches. */
export function flagsFor(view: OfficialSelectionViewDto, proposalId: string | null) {
  const proposal = view.proposals.find((row) => row.id === proposalId);
  if (!proposal) return [];
  return view.integrityFlags.filter((flag) =>
    proposal.slots.some(
      (slot) =>
        slot.providerMatchRef.providerKey === flag.providerMatchRef.providerKey &&
        slot.providerMatchRef.externalId === flag.providerMatchRef.externalId,
    ),
  );
}

/**
 * Whether approving the chosen proposal needs the acknowledgement: it carries served
 * flags, or the server already refused the approval for lack of one.
 */
export function acknowledgementRequired(
  view: OfficialSelectionViewDto,
  input: OperatorInput,
  submission: Submission<OperatorIntent>,
): boolean {
  return (
    flagsFor(view, input.proposalId).length > 0 ||
    (submission.status === "invalid" &&
      submission.code === "results.integrity_flags_not_acknowledged")
  );
}

export type OperatorIntentCheck =
  | { readonly ok: true; readonly intent: OperatorIntent }
  | { readonly ok: false; readonly missing: "proposal" | "acknowledgement" | "reason" };

/** Builds the intent from what the operator entered, or names the first missing input. */
export function buildOperatorIntent(
  command: OperatorCommand,
  view: OfficialSelectionViewDto,
  input: OperatorInput,
  submission: Submission<OperatorIntent>,
): OperatorIntentCheck {
  const reason = input.reasons[command].trim();
  switch (command) {
    case "review_dispute":
    case "return_to_selection":
      return reason
        ? { ok: true, intent: { kind: command, reason } }
        : { ok: false, missing: "reason" };
    case "approve_proposal": {
      const proposalId = approvableProposals(view).find((row) => row.id === input.proposalId)?.id;
      if (!proposalId) return { ok: false, missing: "proposal" };
      if (acknowledgementRequired(view, input, submission) && !input.acknowledged) {
        return { ok: false, missing: "acknowledgement" };
      }
      if (!reason) return { ok: false, missing: "reason" };
      return {
        ok: true,
        intent: {
          kind: "approve_proposal",
          proposalId,
          reason,
          acknowledgeIntegrityFlags: input.acknowledged,
        },
      };
    }
    default: {
      const exhaustive: never = command;
      return exhaustive;
    }
  }
}
