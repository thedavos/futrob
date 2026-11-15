import { useState } from "react";
import type { OfficialSelectionViewDto } from "@futrob/api-contracts";
import type { DisputeReviewState } from "./dispute-review-section.tsx";
import type { OperatorIntent } from "./dispute-review-draft.ts";
import {
  awayRematch,
  disputeCase,
  homeProposal,
  m3Disconnected,
  resolvedByApproval,
  returnedToSelection,
  reviewCase,
} from "./official-selection.fixtures.ts";
import type { Attempt, CommandOutcome } from "./selection-draft.ts";

export const REVIEW_SCENARIOS = [
  "loading",
  "forbidden",
  "disputed",
  "organizerReview",
  "rematch",
  "approved",
  "returned",
  "conflict",
  "failure",
] as const;
export type ReviewScenario = (typeof REVIEW_SCENARIOS)[number];

const noop = () => undefined;
/** Answers after a short delay, moving the served view first as a refetch would. */
const settle = (outcome: CommandOutcome, served?: () => void) =>
  new Promise<CommandOutcome>((resolve) =>
    setTimeout(() => {
      served?.();
      resolve(outcome);
    }, 400),
  );

const FIRST_VIEW = {
  loading: reviewCase(),
  forbidden: reviewCase(),
  disputed: disputeCase(),
  organizerReview: reviewCase({ integrityFlags: m3Disconnected }),
  rematch: { ...reviewCase(), proposals: [homeProposal, awayRematch] },
  approved: resolvedByApproval(),
  returned: returnedToSelection(),
  conflict: reviewCase(),
  failure: reviewCase(),
} satisfies Record<ReviewScenario, OfficialSelectionViewDto>;

/** What the server would serve after accepting the decision. */
function afterDecision({ intent }: Attempt<OperatorIntent>): OfficialSelectionViewDto {
  switch (intent.kind) {
    case "review_dispute":
      return reviewCase({ integrityFlags: m3Disconnected });
    case "approve_proposal":
      return resolvedByApproval();
    case "return_to_selection":
      return returnedToSelection();
    default: {
      const exhaustive: never = intent;
      return exhaustive;
    }
  }
}

/**
 * Operator panel state for stories. Decisions settle after a short delay; `conflict`
 * answers the first one with a 409 that moves the case to version 5, and `failure`
 * loses the first one so the retry replays it.
 */
export function useStoryDisputeReview(
  scenario: ReviewScenario | undefined,
): DisputeReviewState | undefined {
  const [view, setView] = useState<OfficialSelectionViewDto | null>(null);
  const [answered, setAnswered] = useState(false);
  if (!scenario) return undefined;
  if (scenario === "loading") return { kind: "visible", read: { kind: "loading" } };
  if (scenario === "forbidden") return { kind: "visible", read: { kind: "forbidden" } };
  return {
    kind: "visible",
    read: {
      kind: "ready",
      view: view ?? FIRST_VIEW[scenario],
      refreshing: false,
      refreshFailed: false,
      refresh: noop,
      submit: (attempt) => {
        if (!answered && scenario === "conflict") {
          setAnswered(true);
          return settle(
            { ok: false, failure: "conflict", code: "results.selection_version_conflict" },
            () => setView(reviewCase({ version: 5 })),
          );
        }
        if (!answered && scenario === "failure") {
          setAnswered(true);
          return settle({ ok: false, failure: "unknown", code: null });
        }
        return settle({ ok: true }, () => setView(afterDecision(attempt)));
      },
    },
  };
}
