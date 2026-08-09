import type { Permission } from "@futrob/shared-kernel";

export const RESULT_PERMISSION = {
  officialSelectionPropose: "encounters.official-selection.propose",
  officialSelectionResolve: "encounters.official-selection.resolve",
  resultApprove: "encounters.results.approve",
} as const satisfies Record<string, Permission>;

export const RESULT_PERMISSIONS = Object.values(RESULT_PERMISSION);
