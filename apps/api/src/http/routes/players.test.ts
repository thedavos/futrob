import { describe, expect, it } from "vite-plus/test";
import clubInfoFixture from "@/adapters/game-data/ea-clubs/fixtures/club-info.json";
import clubMatchesFixture from "@/adapters/game-data/ea-clubs/fixtures/club-matches.json";
import { buildApp, createFetch, serviceHeaders, stubFetch } from "@/http/http-app.harness.ts";

describe("apps/api personal statistics routes", () => {
  it("rejects invalid personal statistics query filters", async () => {
    const app = buildApp(stubFetch);

    const response = await app.request("/api/v1/players/me/statistics?position=%20", {
      headers: serviceHeaders("actor-player"),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "api.validation_error" });
  });

  it("returns empty matches instead of forbidding a team filter with no contributions", async () => {
    const app = buildApp(stubFetch);

    const response = await app.request("/api/v1/players/me/matches?teamId=team-without-matches", {
      headers: serviceHeaders("actor-player"),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ matches: [], nextCursor: null });
  });

  it("returns needs_club without calling the provider when the player has no associated club", async () => {
    let matchCalls = 0;
    const app = buildApp(
      createFetch((url) => {
        if (url.includes("/clubs/matches")) matchCalls += 1;
        return Response.json([]);
      }),
    );
    const actor = "actor-recent-needs-club";

    await app.request("/api/v1/identity/onboarding/player", {
      method: "POST",
      headers: serviceHeaders(actor),
      body: JSON.stringify({
        gameAccount: {
          identifier: "davos282",
          platform: "nintendo-switch-2",
          gameEdition: "FC 26",
        },
      }),
    });

    const response = await app.request("/api/v1/players/me/recent-matches", {
      headers: serviceHeaders(actor),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "needs_club" });
    expect(matchCalls).toBe(0);
  });

  it("returns needs_game_account without calling the provider when a club is associated without an identifier", async () => {
    let matchCalls = 0;
    const app = buildApp(
      createFetch((url) => {
        if (url.includes("/clubs/matches")) matchCalls += 1;
        if (url.includes("/clubs/info")) return Response.json(clubInfoFixture);
        return Response.json([]);
      }),
    );
    const actor = "actor-recent-needs-account";

    await app.request("/api/v1/identity/onboarding/player", {
      method: "POST",
      headers: serviceHeaders(actor),
      body: JSON.stringify({ gameAccount: null }),
    });
    await app.request("/api/v1/players/me/external-club", {
      method: "POST",
      headers: serviceHeaders(actor),
      body: JSON.stringify({
        providerKey: "ea-clubs",
        externalClubId: "10754",
        platform: "common-gen5",
        gameEdition: "fc26",
        name: "Fera Enjaulada",
        imageUrl: null,
      }),
    });

    const response = await app.request("/api/v1/players/me/recent-matches", {
      headers: serviceHeaders(actor),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "needs_game_account" });
    expect(matchCalls).toBe(0);
  });

  it("returns ready appearances from associated club matches that feature the player", async () => {
    const app = buildApp(
      createFetch((url) => {
        if (url.includes("/clubs/info")) return Response.json(clubInfoFixture);
        if (url.includes("/clubs/matches")) return Response.json(clubMatchesFixture);
        return Response.json([]);
      }),
    );
    const actor = "actor-recent-ready";

    await app.request("/api/v1/identity/onboarding/player", {
      method: "POST",
      headers: serviceHeaders(actor),
      body: JSON.stringify({
        gameAccount: {
          identifier: "Vcaliari",
          platform: "playstation",
          gameEdition: "FC 26",
        },
      }),
    });
    await app.request("/api/v1/players/me/external-club", {
      method: "POST",
      headers: serviceHeaders(actor),
      body: JSON.stringify({
        providerKey: "ea-clubs",
        externalClubId: "10754",
        platform: "common-gen5",
        gameEdition: "fc26",
        name: "Fera Enjaulada",
        imageUrl: null,
      }),
    });

    const response = await app.request("/api/v1/players/me/recent-matches", {
      headers: serviceHeaders(actor),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      status: string;
      matches?: Array<{
        appearance: { displayName: string };
        match: { players: unknown[] };
      }>;
    };
    expect(body.status).toBe("ready");
    expect(body.matches?.length).toBeGreaterThan(0);
    expect(body.matches?.every((row) => row.appearance.displayName === "Vcaliari")).toBe(true);
    expect(body.matches?.every((row) => row.match.players.length === 0)).toBe(true);
  });
});
