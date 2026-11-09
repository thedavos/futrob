import { describe, expect, it } from "vite-plus/test";
import { asActorId } from "@futrob/shared-kernel";
import { createProductApiClient } from "@/context/product-api-client.ts";
import { swissFixture } from "../presentation/competition-fixture.fixtures.ts";
import {
  handleCloseSwissRound,
  handleGenerateCompetitionFixture,
  handleGetCurrentCompetitionFixture,
  handleWithdrawSwissTeam,
} from "./competition-fixture.handler.ts";
import type { ConnectProductApi } from "./schedule-change-requests.handler.ts";

const API = "https://api.futrob.test/api/v1";

function sessionOf(actorId: string, respond: () => Response) {
  const sent: { url: string; actor: string | null; method: string; body?: unknown }[] = [];
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
          ...(init?.body ? { body: JSON.parse(String(init.body)) } : {}),
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

describe("Swiss fixture command BFF", () => {
  const plan = swissFixture.fixture!;
  const fixtureScope = { ...scope, fixturePlanId: "fixture-1" };
  const requestId = "00000000-0000-4000-8000-0000000000aa";
  const post = (body: unknown) =>
    new Request("https://app.futrob.test/api/v1/x", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  const respondWithPlan = () => Response.json(plan);
  const refuse = (status: number, code: string) => () =>
    Response.json({ code, messageKey: `errors.${code}` }, { status });

  it("generates as the session actor and returns the plan", async () => {
    const session = sessionOf("actor-organizer", respondWithPlan);
    const body = {
      generationVersion: 1,
      startsAt: "2026-12-01T01:00:00.000Z",
      roundIntervalDays: 7,
      homeAndAway: false,
      swiss: { rounds: 3 },
    };
    const response = await handleGenerateCompetitionFixture(post(body), scope, session.connect);

    expect(response.status).toBe(200);
    expect(session.sent).toEqual([
      {
        url: `${API}/organizations/org-1/competitions/competition-1/fixture`,
        actor: "actor-organizer",
        method: "POST",
        body,
      },
    ]);
  });

  it("refuses a malformed generation without calling the API", async () => {
    const session = sessionOf("actor-organizer", respondWithPlan);
    const response = await handleGenerateCompetitionFixture(
      post({ generationVersion: 1 }),
      scope,
      session.connect,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "api.validation_error" });
    expect(session.sent).toEqual([]);
  });

  it("keeps the plan gate and a generation conflict as the API answered them", async () => {
    const body = {
      generationVersion: 1,
      startsAt: "2026-12-01T01:00:00.000Z",
      roundIntervalDays: 7,
      homeAndAway: false,
    };
    for (const [status, code] of [
      [402, "competitions.format_not_in_plan"],
      [409, "scheduling.fixture_generation_conflict"],
      [409, "scheduling.fixture_source_not_published"],
    ] as const) {
      const session = sessionOf("actor-organizer", refuse(status, code));
      const response = await handleGenerateCompetitionFixture(post(body), scope, session.connect);
      expect({ status: response.status, body: await response.json() }).toMatchObject({
        status,
        body: { code },
      });
    }
  });

  it("forwards a withdrawal with its request id, so a retry replays", async () => {
    const session = sessionOf("actor-organizer", respondWithPlan);
    const response = await handleWithdrawSwissTeam(
      post({ teamId: "team-sur", reason: "Se retiró", requestId }),
      fixtureScope,
      session.connect,
    );

    expect(response.status).toBe(200);
    expect(session.sent).toEqual([
      {
        url: `${API}/organizations/org-1/competitions/competition-1/fixtures/fixture-1/swiss/withdrawals`,
        actor: "actor-organizer",
        method: "POST",
        body: { teamId: "team-sur", reason: "Se retiró", requestId },
      },
    ]);
  });

  it("refuses a withdrawal without a reason", async () => {
    const session = sessionOf("actor-organizer", respondWithPlan);
    const response = await handleWithdrawSwissTeam(
      post({ teamId: "team-sur", reason: "   " }),
      fixtureScope,
      session.connect,
    );

    expect(response.status).toBe(400);
    expect(session.sent).toEqual([]);
  });

  it("closes the round named in the path", async () => {
    const session = sessionOf("actor-organizer", respondWithPlan);
    const response = await handleCloseSwissRound(
      post({ reason: "Venció el plazo", requestId }),
      { ...fixtureScope, roundNumber: "2" },
      session.connect,
    );

    expect(response.status).toBe(200);
    expect(session.sent).toEqual([
      {
        url: `${API}/organizations/org-1/competitions/competition-1/fixtures/fixture-1/swiss/rounds/2/close`,
        actor: "actor-organizer",
        method: "POST",
        body: { reason: "Venció el plazo", requestId },
      },
    ]);
  });

  it("refuses a round number that is not one, and malformed JSON", async () => {
    const session = sessionOf("actor-organizer", respondWithPlan);
    const notARound = await handleCloseSwissRound(
      post({ reason: "x" }),
      { ...fixtureScope, roundNumber: "second" },
      session.connect,
    );
    const notJson = await handleCloseSwissRound(
      post("{"),
      { ...fixtureScope, roundNumber: "2" },
      session.connect,
    );

    expect([notARound.status, notJson.status]).toEqual([400, 400]);
    expect(session.sent).toEqual([]);
  });

  it("keeps each Swiss refusal's status and code", async () => {
    for (const [status, code] of [
      [409, "scheduling.not_swiss_fixture"],
      [409, "scheduling.swiss_round_not_current"],
      [409, "scheduling.swiss_team_already_withdrawn"],
      [400, "scheduling.swiss_team_not_participant"],
      [403, "authorization.forbidden"],
    ] as const) {
      const session = sessionOf("actor-organizer", refuse(status, code));
      const response = await handleWithdrawSwissTeam(
        post({ teamId: "team-sur", reason: "x", requestId }),
        fixtureScope,
        session.connect,
      );
      expect({ status: response.status, body: await response.json() }).toMatchObject({
        status,
        body: { code },
      });
    }
  });
});
