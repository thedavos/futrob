import { useState } from "react";
import type { OfficialSelectionViewDto } from "@futrob/api-contracts";
import {
  approvedSelection,
  disputedSelection,
  noSelection,
  pendingSelection,
  underReviewWithFlags,
} from "./official-selection.fixtures.ts";
import type { CommandOutcome } from "./selection-draft.ts";
import type { TeamSelectionState, TeamSide } from "./team-selection-section.tsx";

export const SELECTION_SCENARIOS = [
  "none",
  "pendingAsProposer",
  "pendingAsRival",
  "conflict",
  "approved",
  "disputed",
  "underReview",
  "reader",
  "bothSides",
  "forbidden",
  "loading",
  "error",
] as const;
export type SelectionScenario = (typeof SELECTION_SCENARIOS)[number];

const ANSWERS = ["confirm", "reject", "propose_alternative", "open_dispute"] as const;
const noop = () => undefined;
const settle = (outcome: CommandOutcome) =>
  new Promise<CommandOutcome>((resolve) => setTimeout(() => resolve(outcome), 400));

const VIEWS = {
  none: { home: noSelection() },
  pendingAsProposer: { home: pendingSelection(["open_dispute"]) },
  pendingAsRival: { away: pendingSelection([...ANSWERS]) },
  conflict: { away: pendingSelection([...ANSWERS]) },
  approved: { away: approvedSelection() },
  disputed: { away: disputedSelection() },
  underReview: { home: underReviewWithFlags() },
  reader: { home: pendingSelection([]) },
  bothSides: { home: pendingSelection(["open_dispute"]), away: pendingSelection([...ANSWERS]) },
  forbidden: { home: noSelection() },
  loading: { home: noSelection() },
  error: { home: noSelection() },
} satisfies Record<SelectionScenario, Partial<Record<TeamSide, OfficialSelectionViewDto>>>;

/**
 * Team panel state for stories. Commands settle after a short delay; the `conflict`
 * scenario answers its first command with a 409 that moves the selection to version 2.
 */
export function useStoryTeamSelection(
  scenario: SelectionScenario | undefined,
): TeamSelectionState | undefined {
  const views: Partial<Record<TeamSide, OfficialSelectionViewDto>> = VIEWS[scenario ?? "none"];
  const sides = (["home", "away"] as const).filter((side) => views[side]);
  const [side, setSide] = useState<TeamSide>(sides[0] ?? "home");
  const [moved, setMoved] = useState(false);
  if (!scenario) return undefined;
  const acting = { side, sides, choose: setSide };
  if (scenario === "forbidden") return { kind: "visible", acting, read: { kind: "forbidden" } };
  if (scenario === "loading") return { kind: "visible", acting, read: { kind: "loading" } };
  if (scenario === "error") {
    return { kind: "visible", acting, read: { kind: "error", retry: noop } };
  }
  const view = moved ? pendingSelection([...ANSWERS], 2) : views[side];
  if (!view) return { kind: "hidden" };
  return {
    kind: "visible",
    acting,
    read: {
      kind: "ready",
      view,
      refreshing: false,
      refreshFailed: false,
      refresh: noop,
      submit: () => {
        if (scenario === "conflict" && !moved) {
          setMoved(true);
          return settle({
            ok: false,
            failure: "conflict",
            code: "results.selection_version_conflict",
          });
        }
        return settle({ ok: true });
      },
    },
  };
}
