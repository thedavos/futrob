import { describe, expect, it } from "vite-plus/test";
import { FutrobApiError } from "../errors.ts";
import { commandOutcomeOf, isSelectionRefusal, selectionFailureOf } from "./selection-command.ts";

const apiError = (status: number, code = "api.error") =>
  new FutrobApiError({ status, body: { code, messageKey: `errors.${code}` } });

describe("selection command failures", () => {
  it("reconciles version conflicts and explains 409s a reload cannot fix", () => {
    expect(selectionFailureOf(apiError(409, "results.version_conflict"))).toBe("conflict");
    expect(selectionFailureOf(apiError(409, "results.reference_already_claimed"))).toBe("invalid");
    expect(selectionFailureOf(apiError(404, "results.proposal_not_found"))).toBe("invalid");
    expect(selectionFailureOf(apiError(422))).toBe("invalid");
  });

  it("treats refusals as final and transport failures as unknown outcomes", () => {
    expect(selectionFailureOf(apiError(403))).toBe("refused");
    expect(selectionFailureOf(apiError(503))).toBe("unknown");
    expect(selectionFailureOf(new TypeError("Network request failed"))).toBe("unknown");
    expect(isSelectionRefusal(apiError(404))).toBe(true);
    expect(isSelectionRefusal(apiError(500))).toBe(false);
    expect(commandOutcomeOf(apiError(409, "results.version_conflict"))).toEqual({
      ok: false,
      failure: "conflict",
      code: "results.version_conflict",
    });
  });
});
