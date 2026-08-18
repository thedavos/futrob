import type { MatchOutcome } from "./player-match-view.ts";

export const MATCH_OUTCOME_TEXT_CLASS = {
  win: "text-primary",
  draw: "text-[var(--amber-500)] dark:text-[var(--amber-300)]",
  loss: "text-danger",
  unknown: "text-muted-foreground",
} as const satisfies Record<MatchOutcome, string>;

export const FORM_SEGMENT_CLASS = {
  win: "bg-primary",
  draw: "bg-warning",
  loss: "bg-danger",
  unknown: "bg-muted-foreground/40",
} as const satisfies Record<MatchOutcome, string>;

export const FORM_RESULT_FILL_CLASS = {
  win: "bg-primary text-primary-foreground",
  draw: "bg-warning text-warning-foreground",
  loss: "bg-danger text-danger-foreground",
  unknown: "bg-muted text-muted-foreground",
} as const satisfies Record<MatchOutcome, string>;
