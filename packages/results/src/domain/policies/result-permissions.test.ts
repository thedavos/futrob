import { describe, expect, it } from "vite-plus/test";
import { RESULT_PERMISSION, RESULT_PERMISSIONS } from "./result-permissions.ts";

describe("result permissions", () => {
  it("exposes unique permission strings", () => {
    expect(new Set(RESULT_PERMISSIONS).size).toBe(RESULT_PERMISSIONS.length);
  });

  it("scopes every permission to the encounters namespace", () => {
    for (const permission of RESULT_PERMISSIONS) {
      expect(permission.startsWith("encounters.")).toBe(true);
    }
  });

  it("keeps proposal and resolution as separate capabilities", () => {
    expect(RESULT_PERMISSION.officialSelectionPropose).not.toBe(
      RESULT_PERMISSION.officialSelectionResolve,
    );
    expect(RESULT_PERMISSION.resultApprove).not.toBe(RESULT_PERMISSION.officialSelectionResolve);
  });
});
