import * as stylex from "@stylexjs/stylex";
import { colors } from "@futrob/ui/styles/tokens.stylex";

import type { MatchOutcome } from "./player-match-view.ts";

const styles = stylex.create({
  outcomeWin: { color: colors.primary },
  outcomeDraw: { color: colors.mutedForeground },
  outcomeLoss: { color: colors.danger },
  outcomeUnknown: { color: colors.mutedForeground },
  segmentWin: { backgroundColor: colors.primary },
  segmentDraw: { backgroundColor: colors.mutedForeground },
  segmentLoss: { backgroundColor: colors.danger },
  segmentUnknown: {
    backgroundColor: "color-mix(in oklab, var(--muted-foreground) 40%, transparent)",
  },
  fillWin: {
    backgroundColor: colors.primary,
    color: colors.primaryForeground,
  },
  fillDraw: {
    backgroundColor: colors.mutedForeground,
    color: colors.background,
  },
  fillLoss: {
    backgroundColor: colors.danger,
    color: colors.dangerForeground,
  },
  fillUnknown: {
    backgroundColor: "color-mix(in oklab, var(--muted-foreground) 40%, transparent)",
    color: colors.mutedForeground,
  },
});

export function matchOutcomeTextStyle(outcome: MatchOutcome) {
  switch (outcome) {
    case "win":
      return styles.outcomeWin;
    case "draw":
      return styles.outcomeDraw;
    case "loss":
      return styles.outcomeLoss;
    case "unknown":
      return styles.outcomeUnknown;
  }
}

export function formSegmentStyle(outcome: MatchOutcome) {
  switch (outcome) {
    case "win":
      return styles.segmentWin;
    case "draw":
      return styles.segmentDraw;
    case "loss":
      return styles.segmentLoss;
    case "unknown":
      return styles.segmentUnknown;
  }
}

export function formResultFillStyle(outcome: MatchOutcome) {
  switch (outcome) {
    case "win":
      return styles.fillWin;
    case "draw":
      return styles.fillDraw;
    case "loss":
      return styles.fillLoss;
    case "unknown":
      return styles.fillUnknown;
  }
}
