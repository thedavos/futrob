import { describe, expect, it } from "vite-plus/test";
import type { SelectionStatus } from "../value-objects/selection-status.ts";
import {
  canApplySelectionCommand,
  isUnderDispute,
  selectionCommandsFor,
  type SelectionCommand,
} from "./selection-transitions.ts";

const ALL_STATUSES: readonly SelectionStatus[] = [
  "awaiting_provider_data",
  "candidates_available",
  "selection_in_progress",
  "awaiting_opponent_confirmation",
  "confirmed",
  "disputed",
  "organizer_review",
  "approved",
  "voided",
];

describe("selection transition matrix", () => {
  it("accepts only a proposal before any selection exists", () => {
    expect(selectionCommandsFor(null)).toEqual(["propose"]);
    expect(canApplySelectionCommand(null, "confirm")).toBe(false);
  });

  it.each([
    [
      "awaiting_opponent_confirmation",
      ["confirm", "reject", "propose_alternative", "open_dispute"],
    ],
    ["disputed", ["review_dispute"]],
    ["organizer_review", ["resolve_dispute"]],
    ["approved", ["void"]],
    ["voided", ["propose"]],
    ["selection_in_progress", ["propose"]],
    ["confirmed", []],
  ] as const)("%s accepts %j", (status, commands) => {
    expect(selectionCommandsFor(status)).toEqual(commands);
  });

  it("never lets a team command reach an approved, disputed or reviewed selection", () => {
    const teamCommands: SelectionCommand[] = ["confirm", "reject", "propose_alternative"];
    for (const status of ["approved", "disputed", "organizer_review"] as const) {
      for (const command of teamCommands) {
        expect(canApplySelectionCommand(status, command)).toBe(false);
      }
    }
  });

  it("defines the commands of every status", () => {
    for (const status of ALL_STATUSES) {
      expect(Array.isArray(selectionCommandsFor(status))).toBe(true);
    }
  });

  it("marks disputed and organizer_review as under dispute", () => {
    expect(ALL_STATUSES.filter(isUnderDispute)).toEqual(["disputed", "organizer_review"]);
  });
});
