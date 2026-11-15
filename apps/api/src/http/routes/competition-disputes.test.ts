import { describe, expect, it } from "vite-plus/test";
import {
  apiErrorSchema,
  listCompetitionDisputesResponseSchema,
  officialSelectionCommandResponseSchema,
} from "@futrob/api-contracts";
import { InMemoryProviderMatchRepository } from "@/adapters/game-data/persistence/in-memory.repository.ts";
import { createApp } from "@/app.ts";
import {
  AWAY,
  AWAY_CAPTAIN,
  COMPETITION,
  ENCOUNTER,
  HOME,
  HOME_CAPTAIN,
  OPERATOR,
  ORG,
  STAFF,
  seedComposition,
  slot,
} from "@/di/official-selection.composition.fixture.ts";
import { INTERNAL_JOB_SECRET, serviceHeaders } from "@/http/http-app.harness.ts";

const QUEUE = `/api/v1/organizations/${ORG}/competitions/${COMPETITION}/disputes`;
const SELECTION = `/api/v1/organizations/${ORG}/encounters/${ENCOUNTER}/official-selection`;

async function setup() {
  const { modules } = await seedComposition({
    pool: undefined,
    matches: new InMemoryProviderMatchRepository(),
  });
  const app = createApp({
    modules,
    internalJobSecret: INTERNAL_JOB_SECRET,
    checkDbHealth: () => Promise.resolve("skipped"),
    correlationLogger: { info() {}, error() {} },
  });
  const send = (actor: string, path: string, body?: unknown) =>
    app.request(path, {
      method: body === undefined ? "GET" : "POST",
      headers: serviceHeaders(actor),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const queue = async (actor = OPERATOR) => {
    const response = await send(actor, QUEUE);
    expect(response.status).toBe(200);
    return listCompetitionDisputesResponseSchema.parse(await response.json());
  };
  return { app, send, queue };
}

async function dispute(send: Awaited<ReturnType<typeof setup>>["send"]) {
  const proposed = await send(HOME_CAPTAIN, `${SELECTION}/proposals`, {
    actingTeamId: HOME,
    selections: slot("m-1"),
    expectedVersion: 0,
    commandKey: "home-propose",
  });
  expect(proposed.status).toBe(200);
  const proposedBody = officialSelectionCommandResponseSchema.parse(await proposed.json());
  if (proposedBody.proposal === null) throw new Error("propose returned no proposal");
  const proposalId = proposedBody.proposal.id;
  const rejected = await send(AWAY_CAPTAIN, `${SELECTION}/proposals/${proposalId}/reject`, {
    actingTeamId: AWAY,
    expectedVersion: 1,
    commandKey: "away-reject",
    reason: "Marcador incorrecto",
  });
  expect(rejected.status).toBe(200);
  return proposalId;
}

describe("GET /organizations/:organizationId/competitions/:competitionId/disputes", () => {
  it("lists a disputed Encounter with its Teams, then follows it into organizer review and out", async () => {
    const { send, queue } = await setup();
    expect((await queue()).disputes).toEqual([]);

    const proposalId = await dispute(send);
    const disputed = await queue();
    expect(disputed.competition).toEqual({
      id: COMPETITION,
      name: "Copa",
      timeZone: "America/Lima",
    });
    expect(disputed.disputes).toEqual([
      {
        encounterId: ENCOUNTER,
        status: "disputed",
        home: { teamId: HOME, name: "Home" },
        away: { teamId: AWAY, name: "Away" },
        scheduledStartAt: "2026-09-14T20:00:00.000Z",
        since: expect.any(String),
        dispute: {
          id: expect.any(String),
          status: "open",
          openedByTeamId: AWAY,
          openedAt: expect.any(String),
          reviewStartedAt: null,
        },
      },
    ]);
    expect(JSON.stringify(disputed)).not.toContain("Marcador incorrecto");

    const reviewed = await send(OPERATOR, `${SELECTION}/disputes/review`, {
      expectedVersion: 2,
      commandKey: "operator-review",
      reason: "Revisando",
    });
    expect(reviewed.status).toBe(200);
    expect((await queue()).disputes).toEqual([
      expect.objectContaining({
        status: "organizer_review",
        dispute: expect.objectContaining({
          status: "under_review",
          reviewStartedAt: expect.any(String),
        }),
      }),
    ]);

    const resolved = await send(OPERATOR, `${SELECTION}/disputes/resolve`, {
      expectedVersion: 3,
      commandKey: "operator-resolve",
      reason: "Validado",
      decision: { type: "approve_proposal", proposalId },
    });
    expect(resolved.status).toBe(200);
    expect((await queue()).disputes).toEqual([]);
  });

  it("hides the queue from Team captains, staff without results.approve and other tenants", async () => {
    const { send } = await setup();
    await dispute(send);

    for (const [actor, path] of [
      [HOME_CAPTAIN, QUEUE],
      [STAFF, QUEUE],
      [OPERATOR, QUEUE.replace(COMPETITION, "comp-missing")],
      [OPERATOR, QUEUE.replace(ORG, "org-other")],
    ] as const) {
      const response = await send(actor, path);
      expect(response.status).toBe(404);
      expect(apiErrorSchema.parse(await response.json()).code).toBe("competitions.not_found");
    }
  });

  it("requires service authentication", async () => {
    const { app } = await setup();
    const response = await app.request(QUEUE, {
      headers: { "X-Futrob-Actor-Id": OPERATOR },
    });
    expect(response.status).toBe(401);
  });
});
