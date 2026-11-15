import { describe, expect, it } from "vite-plus/test";
import { asActorId } from "@futrob/shared-kernel";
import { createProductApiClient } from "@/context/product-api-client.ts";
import {
  handleGetEncounterView,
  handleListCompetitionDisputes,
  handleListEncounterCandidates,
  type ConnectProductApi,
} from "./encounter-reads.ts";

const API = "https://api.futrob.test/api/v1";

const view = {
  encounterId: "encounter-1",
  competition: {
    id: "competition-1",
    organizationId: "org-1",
    name: "Liga Futrob",
    timeZone: "America/Lima",
  },
  round: null,
  scheduledStartAt: "2026-09-14T20:00:00.000Z",
  officialMatchCount: 1,
  home: { teamId: "team-home", name: "Cuervos FC", externalClub: null },
  away: { teamId: "team-away", name: "Maderas FC", externalClub: null },
  resolutionMode: null,
  officialMatches: [{ officialSlot: 1, scheduledStartAt: "2026-09-14T20:00:00.000Z" }],
};

function sessionOf(actorId: string, respond: (url: string) => Response) {
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
        return respond(String(input));
      },
    }),
  });
  return { connect, sent };
}

const browserGet = () => new Request("https://app.futrob.test/api/v1/whatever");

describe("Encounter page BFF reads", () => {
  it("reads the dispute queue as the session actor and preserves a hidden competition", async () => {
    const queue = {
      competition: { id: "competition-1", name: "Liga Futrob", timeZone: "America/Lima" },
      disputes: [],
    };
    const operator = sessionOf("actor-operator", () => Response.json(queue));
    const outsider = sessionOf("actor-outsider", () =>
      Response.json(
        { code: "competitions.not_found", messageKey: "errors.competitions.not_found" },
        { status: 404 },
      ),
    );
    const scope = { organizationId: "org-1", competitionId: "competition-1" };

    const read = await handleListCompetitionDisputes(browserGet(), scope, operator.connect);
    const hidden = await handleListCompetitionDisputes(browserGet(), scope, outsider.connect);

    expect({ status: read.status, body: await read.json(), sent: operator.sent }).toEqual({
      status: 200,
      body: queue,
      sent: [
        {
          url: `${API}/organizations/org-1/competitions/competition-1/disputes`,
          actor: "actor-operator",
        },
      ],
    });
    expect({ status: hidden.status, body: await hidden.json() }).toMatchObject({
      status: 404,
      body: { code: "competitions.not_found" },
    });
  });

  it("reads the Encounter as the session actor; a hidden Encounter stays not found", async () => {
    const reader = sessionOf("actor-captain", () => Response.json(view));
    const outsider = sessionOf("actor-outsider", () =>
      Response.json(
        {
          code: "scheduling.encounter_not_found",
          messageKey: "errors.scheduling.encounter_not_found",
        },
        { status: 404 },
      ),
    );
    const scope = { organizationId: "org-1", encounterId: "encounter-1" };

    const read = await handleGetEncounterView(browserGet(), scope, reader.connect);
    const hidden = await handleGetEncounterView(browserGet(), scope, outsider.connect);

    expect({ status: read.status, body: await read.json(), sent: reader.sent }).toEqual({
      status: 200,
      body: view,
      sent: [{ url: `${API}/organizations/org-1/encounters/encounter-1`, actor: "actor-captain" }],
    });
    expect({ status: hidden.status, body: await hidden.json() }).toMatchObject({
      status: 404,
      body: { code: "scheduling.encounter_not_found" },
    });
  });

  it("keeps which side has no club instead of answering an empty candidate list", async () => {
    const session = sessionOf("actor-captain", () =>
      Response.json({ status: "clubs_not_connected", sides: ["away"] }),
    );

    const response = await handleListEncounterCandidates(
      browserGet(),
      { encounterId: "encounter-1" },
      session.connect,
    );

    expect({ status: response.status, body: await response.json() }).toEqual({
      status: 200,
      body: { status: "clubs_not_connected", sides: ["away"] },
    });
    expect(session.sent.map((sent) => sent.url)).toEqual([
      `${API}/encounters/encounter-1/candidates`,
    ]);
  });
});
