import { describe, expect, it } from "vite-plus/test";
import { asActorId } from "@futrob/shared-kernel";
import { createProductApiClient } from "@/context/product-api-client.ts";
import { handleGetCurrentCompetitionFixture } from "./competition-fixture.handler.ts";
import type { ConnectProductApi } from "./schedule-change-requests.handler.ts";

const API = "https://api.futrob.test/api/v1";

function sessionOf(actorId: string, respond: () => Response) {
  const sent: { url: string; actor: string | null; method: string }[] = [];
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
          method: init?.method ?? "GET",
        });
        return respond();
      },
    }),
  });
  return { connect, sent };
}

const browserGet = () => new Request("https://app.futrob.test/api/v1/fixture");
const scope = { organizationId: "org-1", competitionId: "competition-1" };

describe("current competition fixture BFF", () => {
  it("reads the current fixture as the session actor", async () => {
    const session = sessionOf("actor-organizer", () => Response.json({ fixture: null, teams: [] }));
    const response = await handleGetCurrentCompetitionFixture(browserGet(), scope, session.connect);

    expect({ status: response.status, body: await response.json(), sent: session.sent }).toEqual({
      status: 200,
      body: { fixture: null, teams: [] },
      sent: [
        {
          url: `${API}/organizations/org-1/competitions/competition-1/fixture`,
          actor: "actor-organizer",
          method: "GET",
        },
      ],
    });
  });

  it("keeps a hidden competition as not found", async () => {
    const session = sessionOf("actor-outsider", () =>
      Response.json(
        {
          code: "scheduling.fixture_plan_not_found",
          messageKey: "errors.scheduling.fixture_plan_not_found",
        },
        { status: 404 },
      ),
    );
    const response = await handleGetCurrentCompetitionFixture(browserGet(), scope, session.connect);

    expect({ status: response.status, body: await response.json() }).toMatchObject({
      status: 404,
      body: { code: "scheduling.fixture_plan_not_found" },
    });
  });
});
