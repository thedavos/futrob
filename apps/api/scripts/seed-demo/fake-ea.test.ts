import { eaClubMatchesResponseSchema, mapClubMatchToProviderMatch } from "@futrob/ea-clubs";
import { describe, expect, it } from "vite-plus/test";
import { DEMO_EA_ID_PREFIX, DemoEaWorld } from "./fake-ea.ts";

function world() {
  const ea = new DemoEaWorld(1);
  const home = ea.addClub({
    number: 1,
    name: "Cóndores FC",
    squad: [
      { gamertag: "Capi_Condor", position: "forward" },
      { gamertag: "Portero_1", position: "goalkeeper" },
    ],
  });
  const away = ea.addClub({
    number: 2,
    name: "Atlético Pumas",
    squad: [
      { gamertag: "Capi_Puma", position: "forward" },
      { gamertag: "Portero_2", position: "goalkeeper" },
    ],
  });
  return { ea, home, away };
}

async function recentMatches(ea: DemoEaWorld, clubId: string, matchType: string) {
  const response = await ea.fetcher()(
    `https://demo-ea.test/api/fc/clubs/matches?platform=common-gen5&clubIds=${clubId}&matchType=${matchType}&maxResultCount=50`,
  );
  const body: unknown = await response.json();
  return eaClubMatchesResponseSchema.parse(body);
}

describe("DemoEaWorld", () => {
  it("serves matches the EA adapter maps, with forced scorers and the man of the match", async () => {
    const { ea, home, away } = world();
    ea.addMatch({
      homeClubId: home.clubId,
      awayClubId: away.clubId,
      occurredAt: new Date(Date.now() - 60_000),
      homeGoals: 3,
      awayGoals: 1,
      scorers: { Capi_Condor: 3 },
    });

    const [match] = await recentMatches(ea, away.clubId, "leagueMatch");
    const mapped = mapClubMatchToProviderMatch(match!, {
      platform: "common-gen5",
      gameEdition: "fc26",
      matchType: "leagueMatch",
      focalExternalClubId: away.clubId,
    });

    expect(home.clubId.startsWith(DEMO_EA_ID_PREFIX)).toBe(true);
    expect(mapped?.home).toMatchObject({ externalClubId: away.clubId, goals: 1 });
    expect(mapped?.away).toMatchObject({ externalClubId: home.clubId, goals: 3 });
    const captain = mapped?.players.find((player) => player.externalPlayerId === "Capi_Condor");
    expect(captain).toMatchObject({ goals: 3, externalClubId: home.clubId });
    expect(mapped?.players.filter((player) => player.isMvp)).toHaveLength(1);
  });

  it("filters by match type and leaves out absent players and future matches", async () => {
    const { ea, home, away } = world();
    ea.addMatch({
      homeClubId: home.clubId,
      awayClubId: away.clubId,
      occurredAt: new Date(Date.now() - 60_000),
      homeGoals: 0,
      awayGoals: 0,
      matchType: "friendlyMatch",
      absent: ["Capi_Condor"],
    });
    ea.addMatch({
      homeClubId: home.clubId,
      awayClubId: away.clubId,
      occurredAt: new Date(Date.now() + 86_400_000),
      homeGoals: 1,
      awayGoals: 0,
      matchType: "friendlyMatch",
    });

    expect(await recentMatches(ea, home.clubId, "leagueMatch")).toEqual([]);
    const friendlies = await recentMatches(ea, home.clubId, "friendlyMatch");
    expect(friendlies).toHaveLength(1);
    expect(Object.keys(friendlies[0]!.players?.[home.clubId] ?? {})).toEqual(["Portero_1"]);
  });

  it("delegates clubs outside the demo world to the fallback", async () => {
    const { ea } = world();
    const fallback: typeof fetch = async () => Response.json({ real: true });

    const response = await ea.fetcher(fallback)(
      "https://demo-ea.test/api/fc/clubs/info?platform=common-gen5&clubIds=123",
    );

    expect(await response.json()).toEqual({ real: true });
  });

  it("round-trips through a snapshot", async () => {
    const { ea, home, away } = world();
    ea.addMatch({
      homeClubId: home.clubId,
      awayClubId: away.clubId,
      occurredAt: new Date(Date.now() - 60_000),
      homeGoals: 2,
      awayGoals: 2,
    });

    const restored = DemoEaWorld.fromSnapshot(JSON.parse(JSON.stringify(ea.snapshot(new Date()))));

    expect(await recentMatches(restored, home.clubId, "leagueMatch")).toHaveLength(1);
  });
});
