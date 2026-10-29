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

describe("public portal SDK resource", () => {
  it("reads the three resources anonymously and encodes the key", async () => {
    const requests: { url: string; authorization: string | null }[] = [];
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (input, init) => {
        const url = requestUrl(input);
        requests.push({ url, authorization: new Headers(init?.headers).get("authorization") });
        if (url.endsWith("/standings")) {
          return Response.json({ standings: { rows: [], updatedAt: null } });
        }
        if (url.endsWith("/calendar")) {
          return Response.json({ calendar: { timeZone: "America/Lima", entries: [] } });
        }
        return Response.json({ competition });
      }),
    });

    await client.publicPortal.getCompetition("copa barranco/1");
    await client.publicPortal.getStandings("copa barranco/1");
    await client.publicPortal.getCalendar("copa barranco/1");

    expect(requests).toEqual([
      {
        url: "https://app.example.com/api/v1/public/competitions/copa%20barranco%2F1",
        authorization: null,
      },
      {
        url: "https://app.example.com/api/v1/public/competitions/copa%20barranco%2F1/standings",
        authorization: null,
      },
      {
        url: "https://app.example.com/api/v1/public/competitions/copa%20barranco%2F1/calendar",
        authorization: null,
      },
    ]);
  });

  it("refuses a body that carries a private key the contract does not allow", async () => {
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async () =>
        Response.json({ competition: { ...competition, organizationId: "org-1" } }),
      ),
    });

    await expect(client.publicPortal.getCompetition("copa")).rejects.toThrow();
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

    const error = await client.publicPortal
      .getStandings("draft")
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(FutrobApiError);
    expect(error).toMatchObject({ status: 404, code: "public_portal.competition_not_found" });
  });
});
