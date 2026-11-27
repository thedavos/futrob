import type { OfficialSelectionViewDto } from "@futrob/api-contracts";

/*
 * The lifecycle every official-selection command shares, whoever issues it: one dialog
 * open at a time, one attempt in flight, and a replay-safe answer to every failure.
 * Team and operator panels supply their own commands, intents and typed input.
 */

export const REASON_MAX_LENGTH = 1000;

/** One command as sent: replaying it with the same key and version is safe. */
export type Attempt<Intent> = {
  readonly intent: Intent;
  readonly expectedVersion: number;
  readonly commandKey: string;
};

export type Failure = "unknown" | "conflict" | "invalid" | "refused";

export type CommandOutcome =
  | { readonly ok: true }
  | { readonly ok: false; readonly failure: Failure; readonly code: string | null };

export type Submission<Intent> =
  | { readonly status: "idle" }
  | { readonly status: "pending"; readonly attempt: Attempt<Intent> }
  /** The request may or may not have landed; a retry replays the same attempt. */
  | { readonly status: "unknown"; readonly attempt: Attempt<Intent> }
  /** The selection moved past the version the user read; nothing is resent on its own. */
  | { readonly status: "conflict"; readonly readVersion: number }
  | { readonly status: "invalid"; readonly code: string | null }
  | { readonly status: "refused" };

export type CommandDraft<
  Command extends string,
  Intent extends { readonly kind: Command },
  Input,
> = {
  /** What the user typed or chose; it survives failures and resets only on success. */
  readonly input: Input;
  readonly open: Command | null;
  readonly submission: Submission<Intent>;
  /** Last command the server accepted, announced once the dialog closes. */
  readonly accepted: Command | null;
};

export type LifecycleEvent<Command extends string, Intent> =
  | { readonly type: "open"; readonly command: Command }
  | { readonly type: "close" }
  | { readonly type: "started"; readonly attempt: Attempt<Intent> }
  | { readonly type: "settled"; readonly outcome: CommandOutcome };

/** Lifecycle events plus the panel's own edits, which must use other `type` names. */
export type CommandEvent<Command extends string, Intent, Edit> =
  | LifecycleEvent<Command, Intent>
  | Edit;

const LIFECYCLE: ReadonlySet<string> = new Set(["open", "close", "started", "settled"]);

function isLifecycle<Command extends string, Intent, Edit extends { readonly type: string }>(
  event: CommandEvent<Command, Intent, Edit>,
): event is LifecycleEvent<Command, Intent> {
  return LIFECYCLE.has(event.type);
}

export function emptyDraft<
  Command extends string,
  Intent extends { readonly kind: Command },
  Input,
>(input: Input): CommandDraft<Command, Intent, Input> {
  return { input, open: null, submission: { status: "idle" }, accepted: null };
}

/**
 * Builds a panel's reducer from its empty input and how its own edits change that
 * input. The lifecycle events are the same for every panel.
 */
export function commandDraftReducer<
  Command extends string,
  Intent extends { readonly kind: Command },
  Input,
  Edit extends { readonly type: string },
>(empty: Input, edit: (input: Input, event: Edit) => Input) {
  type Draft = CommandDraft<Command, Intent, Input>;
  return function reduce(draft: Draft, event: CommandEvent<Command, Intent, Edit>): Draft {
    if (!isLifecycle(event)) return { ...draft, input: edit(draft.input, event) };
    const pending = draft.submission.status === "pending";
    switch (event.type) {
      case "open":
        if (pending || draft.submission.status === "refused") return draft;
        return { ...draft, open: event.command, submission: settledOnClose(draft.submission) };
      case "close":
        if (pending) return draft;
        return { ...draft, open: null, submission: settledOnClose(draft.submission) };
      case "started":
        return {
          ...draft,
          submission: { status: "pending", attempt: event.attempt },
          accepted: null,
        };
      case "settled": {
        if (draft.submission.status !== "pending") return draft;
        const { attempt } = draft.submission;
        const { outcome } = event;
        if (outcome.ok) return { ...emptyDraft(empty), accepted: attempt.intent.kind };
        switch (outcome.failure) {
          case "unknown":
            return { ...draft, submission: { status: "unknown", attempt } };
          case "conflict":
            return {
              ...draft,
              submission: { status: "conflict", readVersion: attempt.expectedVersion },
            };
          case "invalid":
            return { ...draft, submission: { status: "invalid", code: outcome.code } };
          case "refused":
            return { ...draft, open: null, submission: { status: "refused" } };
          default: {
            const exhaustive: never = outcome.failure;
            return exhaustive;
          }
        }
      }
      default: {
        const exhaustive: never = event;
        return exhaustive;
      }
    }
  };
}

/** An unknown outcome survives closing so reopening and resending replays it. */
function settledOnClose<Intent>(submission: Submission<Intent>): Submission<Intent> {
  return submission.status === "unknown" || submission.status === "refused"
    ? submission
    : { status: "idle" };
}

/**
 * The attempt a submit sends, or `null` when it must not send at all. Resending the
 * intent of an unknown outcome reuses its key and version; anything else, including
 * the first submit after a conflict, gets `freshKey` and the version just read.
 */
export function beginAttempt<Intent>(
  submission: Submission<Intent>,
  intent: Intent,
  readVersion: number,
  freshKey: string,
): Attempt<Intent> | null {
  if (submission.status === "pending" || submission.status === "refused") return null;
  if (submission.status === "unknown" && sameIntent(submission.attempt.intent, intent)) {
    return submission.attempt;
  }
  return { intent, expectedVersion: readVersion, commandKey: freshKey };
}

function sameIntent<Intent>(a: Intent, b: Intent): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** A persisted selection read as one panel sees it; `forbidden` reveals nothing. */
export type SelectionRead<Intent> =
  | { readonly kind: "loading" }
  | { readonly kind: "forbidden" }
  | { readonly kind: "error"; readonly retry: () => void }
  | {
      readonly kind: "ready";
      readonly view: OfficialSelectionViewDto;
      readonly refreshing: boolean;
      readonly refreshFailed: boolean;
      readonly refresh: () => void;
      readonly submit: (attempt: Attempt<Intent>) => Promise<CommandOutcome>;
    };

/** Version a command must name: the one read, or `0` before the first proposal. */
export function readVersionOf(view: OfficialSelectionViewDto): number {
  return view.selection?.version ?? 0;
}

export function currentProposalOf(view: OfficialSelectionViewDto) {
  const id = view.selection?.currentProposalId;
  return view.proposals.find((proposal) => proposal.id === id) ?? null;
}
