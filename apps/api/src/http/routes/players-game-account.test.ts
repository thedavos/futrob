import { describe, expect, it } from "vite-plus/test";
import { buildApp, serviceHeaders, stubFetch } from "@/http/http-app.harness.ts";

describe("apps/api personal game account routes", () => {
  it("updates the declared identity of an existing personal game account", async () => {
    const app = buildApp(stubFetch);
    const actor = "actor-update-game-account";
    const headers = serviceHeaders(actor);

    await app.request("/api/v1/identity/onboarding/player", {
      method: "POST",
      headers,
      body: JSON.stringify({
        gameAccount: {
          identifier: "davos282",
          platform: "playstation",
          gameEdition: "FC 26",
        },
      }),
    });

    const profileResponse = await app.request("/api/v1/players/me", { headers });
    expect(profileResponse.status).toBe(200);
    const profile = (await profileResponse.json()) as {
      gameAccounts: readonly { readonly id: string }[];
    };
    const accountId = profile.gameAccounts[0]?.id;
    expect(accountId).toBeTruthy();

    const response = await app.request(`/api/v1/players/me/game-accounts/${accountId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        identifier: "davos283",
        platform: "xbox",
        gameEdition: "FC 25",
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      gameAccount: {
        id: accountId,
        identifier: "davos283",
        platform: "xbox",
        gameEdition: "FC 25",
        providerExternalPlayerId: null,
      },
    });
  });

  it("returns 409 when the updated identity already exists on another account", async () => {
    const app = buildApp(stubFetch);
    const actor = "actor-update-game-account-conflict";
    const headers = serviceHeaders(actor);

    await app.request("/api/v1/identity/onboarding/player", {
      method: "POST",
      headers,
      body: JSON.stringify({
        gameAccount: {
          identifier: "davos282",
          platform: "playstation",
          gameEdition: "FC 26",
        },
      }),
    });
    await app.request("/api/v1/players/me/game-accounts", {
      method: "POST",
      headers,
      body: JSON.stringify({
        identifier: "gamer23",
        platform: "xbox",
        gameEdition: "FC 26",
      }),
    });

    const profileResponse = await app.request("/api/v1/players/me", { headers });
    const profile = (await profileResponse.json()) as {
      gameAccounts: readonly { readonly id: string; readonly identifier: string }[];
    };
    const firstId = profile.gameAccounts.find((item) => item.identifier === "davos282")?.id;
    expect(firstId).toBeTruthy();

    const response = await app.request(`/api/v1/players/me/game-accounts/${firstId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        identifier: "gamer23",
        platform: "xbox",
        gameEdition: "FC 26",
      }),
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "teams.game_account_conflict" });
  });

  it("returns 404 for an unknown personal game account", async () => {
    const app = buildApp(stubFetch);
    const actor = "actor-update-game-account-missing";
    const headers = serviceHeaders(actor);

    await app.request("/api/v1/identity/onboarding/player", {
      method: "POST",
      headers,
      body: JSON.stringify({
        gameAccount: {
          identifier: "davos282",
          platform: "playstation",
          gameEdition: "FC 26",
        },
      }),
    });

    const response = await app.request("/api/v1/players/me/game-accounts/missing-account", {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        identifier: "davos283",
        platform: "xbox",
        gameEdition: "FC 26",
      }),
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: "teams.game_account_not_found" });
  });
});
