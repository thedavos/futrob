import { describe, expect, it } from "vite-plus/test";
import { asActorId } from "@futrob/shared-kernel";
import { createProductApiClient } from "@/context/product-api-client.ts";
import { handleGetCompetitionStandings, type ConnectProductApi } from "./competition-standings.ts";

const API = "https://api.futrob.test/api/v1";

const standings = {
  standings: {
    competitionId: "competition-1",
    organizationId: "org-1",
    formulaVersion: "points-gd-gf-v1",
    rows: [
      {
        position: 1,
        teamId: "team-1",
        played: 2,
        wins: 2,
        draws: 0,
        losses: 0,
        goalsFor: 5,
        goalsAgainst: 1,
        goalDifference: 4,
        points: 6,
      },
    ],
    sourceRevisionMax: 3,
    updatedAt: "2026-10-12T01:00:00.000Z",
  },
};

function sessionOf(actorId: string, respond: () => Response) {
  const sent: { url: string; actor: string | null }[] = [];
  const connect: ConnectProductApi = async () => ({
    client: createProductApiClient({
      actorId: asActorId(actorId),
      internalJobSecret: "internal-secret",
      requestId: "00000000-0000-4000-8000-000000000001",
      baseUrl: API,
      fetchImpl: async (input, init) => {
        sent.push({
          url: String(input),
          actor: new Headers(init?.headers).get("X-Futrob-Actor-Id"),
        });
        return respond();
      },
    }),
  });
  return { connect, sent };
}

const browserGet = () => new Request("https://app.futrob.test/api/v1/whatever");
const scope = { organizationId: "org-1", competitionId: "competition-1" };

describe("Competition standings BFF read", () => {
  it("reads the snapshot as the session actor", async () => {
    const session = sessionOf("actor-operator", () => Response.json(standings));

    const response = await handleGetCompetitionStandings(browserGet(), scope, session.connect);

    expect({ status: response.status, body: await response.json(), sent: session.sent }).toEqual({
      status: 200,
      body: standings,
      sent: [
        {
          url: `${API}/organizations/org-1/competitions/competition-1/standings`,
          actor: "actor-operator",
        },
      ],
    });
  });

  it("answers null, not an error, when no result has been projected", async () => {
    const session = sessionOf("actor-operator", () => Response.json({ standings: null }));

    const response = await handleGetCompetitionStandings(browserGet(), scope, session.connect);

    expect({ status: response.status, body: await response.json() }).toEqual({
      status: 200,
      body: { standings: null },
    });
  });

  it("keeps a refusal as 403 instead of an empty table", async () => {
    const session = sessionOf("actor-outsider", () =>
      Response.json(
        {
          code: "statistics.read_forbidden",
          messageKey: "errors.statistics.read_forbidden",
        },
        { status: 403 },
      ),
    );

    const response = await handleGetCompetitionStandings(browserGet(), scope, session.connect);

    expect({ status: response.status, body: await response.json() }).toMatchObject({
      status: 403,
      body: { code: "statistics.read_forbidden" },
    });
  });

  it("does not forward a snapshot that breaks the contract", async () => {
    const session = sessionOf("actor-operator", () =>
      Response.json({ standings: { ...standings.standings, formulaVersion: "other" } }),
    );

    const response = await handleGetCompetitionStandings(browserGet(), scope, session.connect);

    expect(response.ok).toBe(false);
  });
});
