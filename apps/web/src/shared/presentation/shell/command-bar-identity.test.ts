import { describe, expect, it } from "vite-plus/test";
import {
  commandBarIdentity,
  commandBarIdentityLabel,
  commandBarWorkspace,
  commandBarWorkspaceLabel,
} from "./command-bar-identity.ts";

describe("commandBarIdentity", () => {
  it("uses the first game identifier and the first associated club", () => {
    expect(
      commandBarIdentity({
        gameAccounts: [{ identifier: "davos282" }, { identifier: "other" }],
        clubs: [
          { name: "Fera Enjaulada", imageUrl: "https://example.com/crest.png" },
          { name: "Second", imageUrl: null },
        ],
      }),
    ).toEqual({
      gamertag: "davos282",
      clubName: "Fera Enjaulada",
      imageUrl: "https://example.com/crest.png",
    });
  });

  it("returns nulls when the player has no game account or club", () => {
    expect(commandBarIdentity({ gameAccounts: [], clubs: [] })).toEqual({
      gamertag: null,
      clubName: null,
      imageUrl: null,
    });
  });
});

describe("commandBarIdentityLabel", () => {
  it("joins gamertag and club with a slash", () => {
    expect(
      commandBarIdentityLabel(
        { gamertag: "davos282", clubName: "Fera Enjaulada", imageUrl: null },
        "Tu espacio en Futrob",
      ),
    ).toBe("davos282 / Fera Enjaulada");
  });

  it("falls back to whichever side exists, then to the empty label", () => {
    expect(
      commandBarIdentityLabel(
        { gamertag: "davos282", clubName: null, imageUrl: null },
        "Tu espacio en Futrob",
      ),
    ).toBe("davos282");
    expect(
      commandBarIdentityLabel(
        { gamertag: null, clubName: "Fera Enjaulada", imageUrl: null },
        "Tu espacio en Futrob",
      ),
    ).toBe("Fera Enjaulada");
    expect(
      commandBarIdentityLabel(
        { gamertag: null, clubName: null, imageUrl: null },
        "Tu espacio en Futrob",
      ),
    ).toBe("Tu espacio en Futrob");
  });
});

describe("commandBarWorkspace", () => {
  const model = {
    organizations: [{ organizationId: "org-1", name: "Orga interclubes", role: "member" as const }],
    competitions: [
      {
        competitionId: "comp-1",
        organizationId: "org-1",
        name: "Liga Futrob",
        role: "captain" as const,
      },
    ],
  };

  it("returns null in the personal club context", () => {
    expect(commandBarWorkspace({ kind: "personal" }, model)).toBeNull();
  });

  it("uses the organization name and membership role", () => {
    expect(commandBarWorkspace({ kind: "organization", organizationId: "org-1" }, model)).toEqual({
      name: "Orga interclubes",
      role: "member",
    });
  });

  it("uses the competition name and access role", () => {
    expect(
      commandBarWorkspace(
        { kind: "competition", competitionId: "comp-1", organizationId: "org-1" },
        model,
      ),
    ).toEqual({ name: "Liga Futrob", role: "captain" });
  });

  it("falls back to the selection label without a role when the model has no match", () => {
    expect(
      commandBarWorkspace(
        { kind: "competition", competitionId: "comp-2", organizationId: null, label: "Copa" },
        model,
      ),
    ).toEqual({ name: "Copa", role: null });
  });
});

describe("commandBarWorkspaceLabel", () => {
  it("joins name and role with a slash, then falls back", () => {
    expect(commandBarWorkspaceLabel({ name: "Liga Futrob", role: "captain" }, "Capitán", "x")).toBe(
      "Liga Futrob / Capitán",
    );
    expect(commandBarWorkspaceLabel({ name: "Liga Futrob", role: null }, null, "x")).toBe(
      "Liga Futrob",
    );
    expect(commandBarWorkspaceLabel({ name: null, role: null }, null, "x")).toBe("x");
  });
});
