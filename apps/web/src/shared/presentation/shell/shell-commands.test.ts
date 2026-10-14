import { describe, expect, it } from "vite-plus/test";
import { COMPETITION_PERMISSION } from "@futrob/competitions";

import { commandsFor } from "./shell-commands.ts";
import { WORKSPACE_SELECTION_KIND } from "./workspace-selection.ts";

describe("commandsFor", () => {
  it("returns no command-bar actions for a competition workspace", () => {
    expect(
      commandsFor("/orgs/o1/competitions/c1", {
        kind: WORKSPACE_SELECTION_KIND.competition,
        competitionId: "c1",
        organizationId: "o1",
        label: "Copa",
      }),
    ).toEqual([]);
  });

  it("returns no command-bar actions for the organization workspace", () => {
    expect(
      commandsFor("/orgs/o1", {
        kind: WORKSPACE_SELECTION_KIND.organization,
        organizationId: "o1",
        label: "Org",
      }),
    ).toEqual([]);
    expect(
      commandsFor(
        "/orgs/o1",
        {
          kind: WORKSPACE_SELECTION_KIND.organization,
          organizationId: "o1",
        },
        new Set([COMPETITION_PERMISSION.update]),
      ),
    ).toEqual([]);
  });

  it("returns associate club for ea-clubs path", () => {
    const commands = commandsFor("/player/ea-clubs", {
      kind: WORKSPACE_SELECTION_KIND.personal,
    });
    expect(commands).toEqual([{ id: "associate-club", label: "Añadir club", disabled: false }]);
  });

  it("returns a link-styled accept-invite command for player competitions", () => {
    expect(
      commandsFor("/player/competitions", { kind: WORKSPACE_SELECTION_KIND.personal }),
    ).toEqual([
      { id: "accept-invite", label: "Aceptar invitación", disabled: false, variant: "link" },
    ]);
  });

  it("returns empty for plain personal home", () => {
    expect(commandsFor("/player", { kind: WORKSPACE_SELECTION_KIND.personal })).toEqual([]);
  });
});
