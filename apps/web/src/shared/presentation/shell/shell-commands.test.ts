import { describe, expect, it } from "vite-plus/test";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { ORGANIZATION_PERMISSION } from "@futrob/organizations";
import { TEAM_PERMISSION } from "@futrob/teams";

import { commandsFor } from "./shell-commands.ts";
import { WORKSPACE_SELECTION_KIND } from "./workspace-selection.ts";

describe("commandsFor", () => {
  it("returns competition stubs for competition workspace", () => {
    const commands = commandsFor("/orgs/o1/competitions/c1", {
      kind: WORKSPACE_SELECTION_KIND.competition,
      competitionId: "c1",
      organizationId: "o1",
      label: "Copa",
    });
    expect(commands.map((command) => command.id)).toEqual(["sync", "publish", "manage-roster"]);
    expect(commands.every((command) => command.disabled)).toBe(true);
  });

  it("filters competition actions by effective permissions", () => {
    const captain = commandsFor(
      "/orgs/o1/competitions/c1",
      {
        kind: WORKSPACE_SELECTION_KIND.competition,
        competitionId: "c1",
        organizationId: "o1",
      },
      new Set([TEAM_PERMISSION.rosterManage]),
    );
    expect(captain.map((command) => command.id)).toEqual(["sync", "manage-roster"]);

    const staff = commandsFor(
      "/orgs/o1/competitions/c1",
      {
        kind: WORKSPACE_SELECTION_KIND.competition,
        competitionId: "c1",
        organizationId: "o1",
      },
      new Set([COMPETITION_PERMISSION.publish]),
    );
    expect(staff.map((command) => command.id)).toEqual(["sync", "publish"]);
  });

  it("hides privileged competition actions when capabilities are empty", () => {
    const commands = commandsFor(
      "/orgs/o1/competitions/c1",
      {
        kind: WORKSPACE_SELECTION_KIND.competition,
        competitionId: "c1",
        organizationId: "o1",
      },
      new Set(),
    );
    expect(commands.map((command) => command.id)).toEqual(["sync"]);
  });

  it("returns enabled new-competition for organization workspace", () => {
    const commands = commandsFor("/orgs/o1", {
      kind: WORKSPACE_SELECTION_KIND.organization,
      organizationId: "o1",
      label: "Org",
    });
    expect(commands).toEqual([
      {
        id: "new-competition",
        label: "Nueva competición",
        href: "/orgs/o1/competitions/new",
      },
    ]);
  });

  it("hides new-competition without competitions.update", () => {
    const commands = commandsFor(
      "/orgs/o1",
      {
        kind: WORKSPACE_SELECTION_KIND.organization,
        organizationId: "o1",
      },
      new Set([ORGANIZATION_PERMISSION.read]),
    );
    expect(commands).toEqual([]);
  });

  it("returns associate club for ea-clubs path", () => {
    const commands = commandsFor("/player/ea-clubs", {
      kind: WORKSPACE_SELECTION_KIND.personal,
    });
    expect(commands).toEqual([{ id: "associate-club", label: "Añadir club", disabled: false }]);
  });

  it("returns empty for plain personal home", () => {
    expect(commandsFor("/player", { kind: WORKSPACE_SELECTION_KIND.personal })).toEqual([]);
  });
});
