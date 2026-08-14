import { describe, expect, it } from "vite-plus/test";
import { commandBarIdentity, commandBarIdentityLabel } from "./command-bar-identity.ts";

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
        "Espacio personal",
      ),
    ).toBe("davos282 / Fera Enjaulada");
  });

  it("falls back to whichever side exists, then to the empty label", () => {
    expect(
      commandBarIdentityLabel(
        { gamertag: "davos282", clubName: null, imageUrl: null },
        "Espacio personal",
      ),
    ).toBe("davos282");
    expect(
      commandBarIdentityLabel(
        { gamertag: null, clubName: "Fera Enjaulada", imageUrl: null },
        "Espacio personal",
      ),
    ).toBe("Fera Enjaulada");
    expect(
      commandBarIdentityLabel(
        { gamertag: null, clubName: null, imageUrl: null },
        "Espacio personal",
      ),
    ).toBe("Espacio personal");
  });
});
