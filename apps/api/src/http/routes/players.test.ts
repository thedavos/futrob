import {
  getMyGameProfileResponseSchema,
  getMyRecentMatchResponseSchema,
  getMyRecentMatchesResponseSchema,
} from "@futrob/api-contracts";
import { describe, expect, it } from "vite-plus/test";
import clubInfoFixture from "@/adapters/game-data/ea-clubs/fixtures/club-info.json";
import clubMatchesFixture from "@/adapters/game-data/ea-clubs/fixtures/club-matches.json";
import { buildApp, createFetch, serviceHeaders, stubFetch } from "@/http/http-app.harness.ts";
import { parseResponse } from "@/http/parse-response.ts";

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
    const body = await parseResponse(getMyRecentMatchesResponseSchema, response);
    expect(body.status).toBe("ready");
    if (body.status !== "ready") {
      return;
    }
    expect(body.matches.length).toBeGreaterThan(0);
    expect(
      body.matches.every(
        (row) => row.kind === "played" && row.appearance?.displayName === "Vcaliari",
      ),
    ).toBe(true);
    expect(body.matches.every((row) => !("players" in row.match))).toBe(true);
  });

  it("returns a ready game profile from played appearances", async () => {
    const app = buildApp(
      createFetch((url) => {
        if (url.includes("/clubs/info")) return Response.json(clubInfoFixture);
        if (url.includes("/clubs/matches")) return Response.json(clubMatchesFixture);
        return Response.json([]);
      }),
    );
    const actor = "actor-game-profile-ready";
    await onboardPlayerWithAccount(app, actor);
    await associateClub(app, actor, { externalClubId: "10754", name: "Fera Enjaulada" });

    const response = await app.request("/api/v1/players/me/game-profile", {
      headers: serviceHeaders(actor),
    });

    expect(response.status).toBe(200);
    const body = await parseResponse(getMyGameProfileResponseSchema, response);
    expect(body.status).toBe("ready");
    if (body.status !== "ready") return;
    expect(body.profile.sampleSize).toBeGreaterThan(0);
    expect(body.profile.identity.displayName).toBe("Vcaliari");
    expect(body.profile.attributes.map((row) => row.category)).toEqual([
      "attack",
      "pass",
      "defense",
      "impact",
      "discipline",
    ]);
    expect(body.profile.summary.matchesPlayed).toBe(body.profile.sampleSize);
    expect(body.profile).not.toHaveProperty("elo");
    expect(body.profile.evolution.every((point) => !("elo" in point))).toBe(true);
  });

  it("rejects a game-profile query that sends only one period bound", async () => {
    const app = buildApp(createFetch(() => Response.json([])));
    const actor = "actor-game-profile-period";
    await onboardPlayerWithAccount(app, actor);
    await associateClub(app, actor, { externalClubId: "10754", name: "Fera Enjaulada" });

    const response = await app.request(
      "/api/v1/players/me/game-profile?from=2026-08-25T00:00:00.000Z",
      { headers: serviceHeaders(actor) },
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "api.validation_error" });
  });

  it("queries only the selected associated club for recent matches", async () => {
    const matchUrls: string[] = [];
    const app = buildApp(
      createFetch((url) => {
        if (url.includes("/clubs/info")) return Response.json(twoClubInfo());
        if (url.includes("/clubs/matches")) {
          matchUrls.push(url);
          return Response.json(clubMatchesFixture);
        }
        return Response.json([]);
      }),
    );
    const actor = "actor-recent-selected-club";
    await onboardPlayerWithAccount(app, actor);
    await associateClub(app, actor, { externalClubId: "10754", name: "Fera Enjaulada" });
    await associateClub(app, actor, { externalClubId: "44001", name: "Night Owls" });

    const response = await app.request("/api/v1/players/me/recent-matches?externalClubId=10754", {
      headers: serviceHeaders(actor),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ready" });
    expect(matchUrls).toHaveLength(3);
    expect(matchUrls.every((url) => new URL(url).searchParams.get("clubIds") === "10754")).toBe(
      true,
    );
  });

  it("queries every associated club when recent-matches omits externalClubId", async () => {
    const matchUrls: string[] = [];
    const app = buildApp(
      createFetch((url) => {
        if (url.includes("/clubs/info")) return Response.json(twoClubInfo());
        if (url.includes("/clubs/matches")) {
          matchUrls.push(url);
          return Response.json(clubMatchesFixture);
        }
        return Response.json([]);
      }),
    );
    const actor = "actor-recent-all-clubs";
    await onboardPlayerWithAccount(app, actor);
    await associateClub(app, actor, { externalClubId: "10754", name: "Fera Enjaulada" });
    await associateClub(app, actor, { externalClubId: "44001", name: "Night Owls" });

    const response = await app.request("/api/v1/players/me/recent-matches", {
      headers: serviceHeaders(actor),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ready" });
    const clubIds = new Set(matchUrls.map((url) => new URL(url).searchParams.get("clubIds")));
    expect(clubIds).toEqual(new Set(["10754", "44001"]));
    expect(matchUrls).toHaveLength(6);
  });

  it("rejects a recent-matches club that is not associated", async () => {
    let matchCalls = 0;
    const app = buildApp(
      createFetch((url) => {
        if (url.includes("/clubs/info")) return Response.json(clubInfoFixture);
        if (url.includes("/clubs/matches")) {
          matchCalls += 1;
          return Response.json(clubMatchesFixture);
        }
        return Response.json([]);
      }),
    );
    const actor = "actor-recent-unknown-club";
    await onboardPlayerWithAccount(app, actor);
    await associateClub(app, actor, { externalClubId: "10754", name: "Fera Enjaulada" });

    const response = await app.request("/api/v1/players/me/recent-matches?externalClubId=44001", {
      headers: serviceHeaders(actor),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "api.validation_error" });
    expect(matchCalls).toBe(0);
  });

  it("returns the full roster for a recent provider match detail", async () => {
    const app = buildApp(
      createFetch((url) => {
        if (url.includes("/clubs/info")) return Response.json(clubInfoFixture);
        if (url.includes("/clubs/matches")) return Response.json(clubMatchesFixture);
        return Response.json([]);
      }),
    );
    const actor = "actor-recent-detail-ready";
    await onboardPlayerWithAccount(app, actor);
    await associateClub(app, actor, { externalClubId: "10754", name: "Fera Enjaulada" });

    const response = await app.request(
      "/api/v1/players/me/recent-matches/ea-clubs/336118610940060?externalClubId=10754",
      { headers: serviceHeaders(actor) },
    );

    expect(response.status).toBe(200);
    const body = await parseResponse(getMyRecentMatchResponseSchema, response);
    expect(body.status).toBe("ready");
    if (body.status !== "ready") return;
    expect(body.match.kind).toBe("played");
    expect(body.match.match.players.map((player) => player.displayName)).toEqual([
      "Vcaliari",
      "Rival Cap",
    ]);
  });

  it("validates provider and club association before provider egress", async () => {
    let matchCalls = 0;
    const app = buildApp(
      createFetch((url) => {
        if (url.includes("/clubs/info")) return Response.json(clubInfoFixture);
        if (url.includes("/clubs/matches")) matchCalls += 1;
        return Response.json([]);
      }),
    );
    const actor = "actor-recent-detail-isolation";
    await onboardPlayerWithAccount(app, actor);
    await associateClub(app, actor, { externalClubId: "10754", name: "Fera Enjaulada" });

    const invalidProvider = await app.request(
      "/api/v1/players/me/recent-matches/not-a-provider/match-1?externalClubId=10754",
      { headers: serviceHeaders(actor) },
    );
    const otherClub = await app.request(
      "/api/v1/players/me/recent-matches/ea-clubs/match-1?externalClubId=44001",
      { headers: serviceHeaders(actor) },
    );
    const omittedClub = await app.request("/api/v1/players/me/recent-matches/ea-clubs/match-1", {
      headers: serviceHeaders(actor),
    });

    expect(invalidProvider.status).toBe(400);
    expect(otherClub.status).toBe(400);
    expect(omittedClub.status).toBe(400);
    expect(matchCalls).toBe(0);
  });

  it("returns not_found only after a complete recent window", async () => {
    const app = buildApp(
      createFetch((url) => {
        if (url.includes("/clubs/info")) return Response.json(clubInfoFixture);
        if (url.includes("/clubs/matches")) return Response.json(clubMatchesFixture);
        return Response.json([]);
      }),
    );
    const actor = "actor-recent-detail-not-found";
    await onboardPlayerWithAccount(app, actor);
    await associateClub(app, actor, { externalClubId: "10754", name: "Fera Enjaulada" });

    const response = await app.request(
      "/api/v1/players/me/recent-matches/ea-clubs/missing?externalClubId=10754",
      { headers: serviceHeaders(actor) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "not_found" });
  });

  it("returns not_found for an unregistered provider instead of crashing", async () => {
    let matchCalls = 0;
    const app = buildApp(
      createFetch((url) => {
        if (url.includes("/clubs/info")) return Response.json(clubInfoFixture);
        if (url.includes("/clubs/matches")) matchCalls += 1;
        return Response.json([]);
      }),
    );
    const actor = "actor-recent-detail-unregistered";
    await onboardPlayerWithAccount(app, actor);
    await associateClub(app, actor, {
      providerKey: "screenshot-ocr",
      externalClubId: "ocr-club",
      name: "OCR Club",
    });

    const response = await app.request(
      "/api/v1/players/me/recent-matches/screenshot-ocr/match-1?externalClubId=ocr-club",
      { headers: serviceHeaders(actor) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "not_found" });
    expect(matchCalls).toBe(0);
  });

  it("maps upstream and open-circuit detail failures to 502 then 503", async () => {
    const app = buildApp(
      createFetch((url) => {
        if (url.includes("/clubs/info")) return Response.json(clubInfoFixture);
        if (url.includes("/clubs/matches")) {
          return new Response("upstream unavailable", { status: 502 });
        }
        return Response.json([]);
      }),
    );
    const actor = "actor-recent-detail-provider-errors";
    await onboardPlayerWithAccount(app, actor);
    await associateClub(app, actor, { externalClubId: "10754", name: "Fera Enjaulada" });
    const path = "/api/v1/players/me/recent-matches/ea-clubs/match-1?externalClubId=10754";

    const upstreamFailure = await app.request(path, { headers: serviceHeaders(actor) });
    const openCircuit = await app.request(path, { headers: serviceHeaders(actor) });

    expect(upstreamFailure.status).toBe(502);
    expect(openCircuit.status).toBe(503);
  });
});

async function onboardPlayerWithAccount(
  app: ReturnType<typeof buildApp>,
  actor: string,
): Promise<void> {
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
}

async function associateClub(
  app: ReturnType<typeof buildApp>,
  actor: string,
  club: {
    readonly externalClubId: string;
    readonly name: string;
    readonly providerKey?: "ea-clubs" | "manual" | "screenshot-ocr";
  },
): Promise<void> {
  const response = await app.request("/api/v1/players/me/external-club", {
    method: "POST",
    headers: serviceHeaders(actor),
    body: JSON.stringify({
      providerKey: club.providerKey ?? "ea-clubs",
      externalClubId: club.externalClubId,
      platform: "common-gen5",
      gameEdition: "fc26",
      name: club.name,
      imageUrl: null,
    }),
  });
  expect(response.status).toBe(201);
}

function twoClubInfo() {
  const fera = clubInfoFixture["10754"];
  return {
    ...clubInfoFixture,
    "44001": {
      ...fera,
      name: "Night Owls",
      clubId: 44001,
    },
  };
}
