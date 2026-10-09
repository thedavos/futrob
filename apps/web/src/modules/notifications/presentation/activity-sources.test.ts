import { describe, expect, it } from "vite-plus/test";
import { pendingActivitySource } from "./activity-sources.ts";

const OPERATOR = new Set(["encounters.results.approve"]);
const MEMBER = new Set(["organizations.read"]);

describe("pending activity source", () => {
  it("reads the organization feed only for operators of the active space", () => {
    expect(
      pendingActivitySource({ kind: "organization", organizationId: "org-a" }, OPERATOR),
    ).toEqual({ kind: "organization", organizationId: "org-a" });
    expect(
      pendingActivitySource({ kind: "organization", organizationId: "org-a" }, MEMBER),
    ).toEqual({
      kind: "mine",
      organizationId: "org-a",
    });
    expect(
      pendingActivitySource(
        { kind: "competition", competitionId: "cmp-a", organizationId: "org-a" },
        OPERATOR,
      ),
    ).toEqual({ kind: "organization", organizationId: "org-a", competitionId: "cmp-a" });
    expect(
      pendingActivitySource(
        { kind: "competition", competitionId: "cmp-a", organizationId: "org-a" },
        MEMBER,
      ),
    ).toEqual({ kind: "mine", competitionId: "cmp-a" });
    expect(pendingActivitySource({ kind: "personal" }, OPERATOR)).toEqual({ kind: "mine" });
  });
});
