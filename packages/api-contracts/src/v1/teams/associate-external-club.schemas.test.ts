import { describe, expect, it } from "vite-plus/test";
import {
  associateMyPlayerExternalClubRequestSchema,
  associateMyPlayerExternalClubResponseSchema,
} from "./schemas.ts";

describe("associateMyPlayerExternalClub contracts", () => {
  it("accepts the searched club and returns the persisted association", () => {
    const request = associateMyPlayerExternalClubRequestSchema.parse({
      providerKey: "ea-clubs",
      externalClubId: "10754",
      platform: "common-gen5",
      gameEdition: "fc26",
      name: "Fera Enjaulada",
      imageUrl: "https://example.com/fera.png",
    });
    expect(request).toMatchObject({
      externalClubId: "10754",
      name: "Fera Enjaulada",
      imageUrl: "https://example.com/fera.png",
    });

    const response = associateMyPlayerExternalClubResponseSchema.parse({
      profile: {
        id: "player-1",
        createdAt: "2026-08-11T12:00:00.000Z",
      },
      externalClub: {
        playerProfileId: "player-1",
        providerKey: "ea-clubs",
        externalClubId: "10754",
        externalClubName: "Fera Enjaulada",
        platform: "common-gen5",
        gameEdition: "fc26",
        imageUrl: null,
        associatedAt: "2026-08-11T12:00:00.000Z",
      },
    });
    expect(response.externalClub.externalClubName).toBe("Fera Enjaulada");
  });
});
