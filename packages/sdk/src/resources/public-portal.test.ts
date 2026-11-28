import { describe, expect, it } from "vite-plus/test";
import { createFutrobClient } from "../client.ts";
import { FutrobApiError } from "../errors.ts";
import { mockFetch, requestUrl } from "../testing/mock-fetch.ts";

const competition = {
  name: "Copa Barranco",
  status: "published",
  format: "league",
  platform: "playstation",
  gameEdition: "fc26",
  region: "south-america",
  timeZone: "America/Lima",
  startsOn: null,
  endsOn: null,
  approvedTeamCount: 2,
  coverPreset: null,
};

const REF = { organizationSlug: "liga-norte", competitionKey: "copa" };

describe("public portal SDK resource", () => {
  it("reads every resource anonymously and encodes both parts of the key", async () => {
    const requests: { url: string; authorization: string | null }[] = [];
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (input, init) => {
        const url = requestUrl(input);
        requests.push({ url, authorization: new Headers(init?.headers).get("authorization") });
        if (url.endsWith("/standings")) {
          return Response.json({ standings: { rows: [], swiss: null, updatedAt: null } });
        }
        if (url.endsWith("/calendar")) {
          return Response.json({ calendar: { timeZone: "America/Lima", entries: [] } });
        }
        if (url.endsWith("/teams")) return Response.json({ teams: [] });
        if (url.endsWith("/bracket")) return Response.json({ bracket: null });
        if (url.endsWith("/rules")) {
          return Response.json({
            rules: { format: "league", teams: null, stages: [], maxRosterSize: null },
          });
        }
        if (url.endsWith("/rankings/mvp")) {
          return Response.json({ ranking: { kind: "mvp", rows: [], updatedAt: null } });
        }
        return Response.json({ competition });
      }),
    });

    const ref = { organizationSlug: "liga/norte", competitionKey: "copa barranco/1" };
    await client.publicPortal.getCompetition(ref);
    await client.publicPortal.getStandings(ref);
    await client.publicPortal.getCalendar(ref);
    await client.publicPortal.getTeams(ref);
    await client.publicPortal.getRules(ref);
    await client.publicPortal.getBracket(ref);
    await client.publicPortal.getRanking(ref, "mvp");

    const base =
      "https://app.example.com/api/v1/public/organizations/liga%2Fnorte/competitions/copa%20barranco%2F1";
    expect(requests).toEqual(
      ["", "/standings", "/calendar", "/teams", "/rules", "/bracket", "/rankings/mvp"].map(
        (suffix) => ({ url: `${base}${suffix}`, authorization: null }),
      ),
    );
  });

  it("reads standings and a bracket from an API with or without the fixture outcome fields", async () => {
    const encounter = {
      order: 1,
      scheduledStartAt: "2026-11-08T20:00:00.000Z",
      officialMatchCount: 2,
      home: { kind: "team", name: "Barranco FC" },
      away: { kind: "team", name: "Surquillo United" },
      status: "official",
      score: [
        { homeGoals: 3, awayGoals: 0 },
        { homeGoals: 0, awayGoals: 1 },
      ],
    };
    const bracketOf = (value: object) => ({
      bracket: {
        timeZone: "UTC",
        stages: [
          {
            kind: "knockout",
            rounds: [
              { number: 1, scheduledStartAt: encounter.scheduledStartAt, encounters: [value] },
            ],
          },
        ],
      },
    });
    const clientAnswering = (standings: object, bracket: object) =>
      createFutrobClient({
        baseUrl: "https://app.example.com/api/v1",
        fetchImpl: mockFetch(async (input) =>
          Response.json(requestUrl(input).endsWith("/bracket") ? bracket : { standings }),
        ),
      });
    const table = { rows: [], swiss: null, updatedAt: null };

    // An API deployed before the fields existed: they read as null.
    const previous = clientAnswering(table, bracketOf(encounter));
    expect((await previous.publicPortal.getStandings(REF)).standings.qualifyingSpots).toBeNull();
    expect(
      (await previous.publicPortal.getBracket(REF)).bracket?.stages[0]?.rounds[0]?.encounters[0]
        ?.winner,
    ).toBeNull();

    const current = clientAnswering(
      { ...table, qualifyingSpots: 2 },
      bracketOf({ ...encounter, winner: "home" }),
    );
    expect((await current.publicPortal.getStandings(REF)).standings.qualifyingSpots).toBe(2);
    expect(
      (await current.publicPortal.getBracket(REF)).bracket?.stages[0]?.rounds[0]?.encounters[0]
        ?.winner,
    ).toBe("home");
  });

  it("refuses a body that carries a private key the contract does not allow", async () => {
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async () =>
        Response.json({ competition: { ...competition, organizationId: "org-1" } }),
      ),
    });

    await expect(client.publicPortal.getCompetition(REF)).rejects.toThrow();
  });

  it("surfaces the not-found code for an unpublished competition", async () => {
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async () =>
        Response.json(
          {
            code: "public_portal.competition_not_found",
            messageKey: "errors.public_portal.competition_not_found",
          },
          { status: 404 },
        ),
      ),
    });

    const error = await client.publicPortal.getStandings(REF).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(FutrobApiError);
    expect(error).toMatchObject({ status: 404, code: "public_portal.competition_not_found" });
  });

  it("lists published competitions anonymously from the public root", async () => {
    const requests: { url: string; authorization: string | null }[] = [];
    const listing = {
      organizationSlug: "liga-norte",
      competitionKey: "copa",
      updatedAt: "2026-11-08T20:00:00.000Z",
    };
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (input, init) => {
        requests.push({
          url: requestUrl(input),
          authorization: new Headers(init?.headers).get("authorization"),
        });
        return Response.json({ competitions: [listing] });
      }),
    });

    await expect(client.publicPortal.listCompetitions()).resolves.toEqual({
      competitions: [listing],
    });
    expect(requests).toEqual([
      { url: "https://app.example.com/api/v1/public/competitions", authorization: null },
    ]);
  });
});
