import type { ActivityEntryDto } from "@futrob/api-contracts";
import { describe, expect, it } from "vite-plus/test";
import { pendingActivitySource, rowsForSource } from "./activity-sources.ts";

const OPERATOR = new Set(["encounters.results.approve"]);
const MEMBER = new Set(["organizations.read"]);

function row(organizationId: string, competitionId: string | null): ActivityEntryDto {
  return {
    id: `${organizationId}-${competitionId}`,
    organizationId,
    competitionId,
    audience: "actor",
    kind: "roster_invitation",
    status: "open",
    requiresAction: true,
    resourceType: "roster_invitation",
    resourceId: "inv",
    subject: { competitionName: null, encounterLabel: null, teamName: null },
    openedAt: "2026-10-07T10:00:00.000Z",
    closedAt: null,
    expiresAt: null,
    lastEventAt: "2026-10-07T10:00:00.000Z",
  };
}

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

  it("narrows rows to the organization or competition of the source", () => {
    const rows = [row("org-a", "cmp-a"), row("org-a", "cmp-b"), row("org-b", "cmp-c")];
    expect(rowsForSource(rows, { kind: "mine" })).toHaveLength(3);
    expect(rowsForSource(rows, { kind: "mine", organizationId: "org-a" }).map((r) => r.id)).toEqual(
      ["org-a-cmp-a", "org-a-cmp-b"],
    );
    expect(rowsForSource(rows, { kind: "mine", competitionId: "cmp-b" }).map((r) => r.id)).toEqual([
      "org-a-cmp-b",
    ]);
  });
});
