import { describe, expect, it } from "vite-plus/test";

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
    expect(commands.map((command) => command.id)).toEqual(["sync", "publish"]);
    expect(commands.every((command) => command.disabled)).toBe(true);
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

  it("returns associate club for ea-clubs path", () => {
    const commands = commandsFor("/player/ea-clubs", {
      kind: WORKSPACE_SELECTION_KIND.personal,
    });
    expect(commands).toEqual([{ id: "associate-club", label: "Asociar club", disabled: false }]);
  });

  it("returns empty for plain personal home", () => {
    expect(commandsFor("/player", { kind: WORKSPACE_SELECTION_KIND.personal })).toEqual([]);
  });
});
