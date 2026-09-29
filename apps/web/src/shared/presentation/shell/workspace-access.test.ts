import { describe, expect, it } from "vite-plus/test";
import {
  prefetchableWorkspaceSelections,
  workspaceAccessQueryOptions,
  workspaceAuthorizationScope,
} from "./workspace-access.ts";
import { WORKSPACE_SELECTION_KIND } from "./workspace-selection.ts";
import { buildWorkspaceSelectorModel } from "./workspace-selector-model.ts";

describe("workspaceAuthorizationScope", () => {
  it("scopes an organization workspace to its organization", () => {
    expect(
      workspaceAuthorizationScope(
        { kind: WORKSPACE_SELECTION_KIND.organization, organizationId: "o1", label: "Liga" },
        undefined,
      ),
    ).toEqual({ organizationId: "o1" });
  });

  it("omits the team when the player has no roster in the competition", () => {
    expect(
      workspaceAuthorizationScope(
        { kind: WORKSPACE_SELECTION_KIND.competition, competitionId: "c1", organizationId: "o1" },
        { activeRosterMembershipId: null, teams: [] },
      ),
    ).toEqual({ organizationId: "o1", competitionId: "c1" });
  });

  it("has no scope for the personal workspace", () => {
    expect(
      workspaceAuthorizationScope({ kind: WORKSPACE_SELECTION_KIND.personal }, undefined),
    ).toEqual({});
  });
});

describe("prefetchableWorkspaceSelections", () => {
  it("resolves the same access query the shell reads after selecting an option", () => {
    const model = buildWorkspaceSelectorModel({
      memberships: [{ organizationId: "o1", name: "Liga", role: "organizer" }],
      competitions: [
        { competitionId: "c1", organizationId: "o1", name: "Copa", accessRole: "staff" },
      ],
      associatedClubs: [],
      clubRosterRoles: [],
    });

    const prefetched = prefetchableWorkspaceSelections(model).map(
      (selection) =>
        workspaceAccessQueryOptions(workspaceAuthorizationScope(selection, undefined)).queryKey,
    );
    const selected = workspaceAccessQueryOptions(
      workspaceAuthorizationScope(
        {
          kind: WORKSPACE_SELECTION_KIND.competition,
          competitionId: "c1",
          organizationId: "o1",
          label: "Copa",
        },
        undefined,
      ),
    ).queryKey;

    expect(prefetched).toHaveLength(2);
    expect(prefetched).toContainEqual(selected);
  });
});
