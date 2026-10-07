import { describe, expect, it } from "vite-plus/test";
import { asActorId } from "@futrob/shared-kernel";
import { AuthUnauthenticatedError } from "@/context/auth.ts";
import { createProductApiClient } from "@/context/product-api-client.ts";
import {
  handleGetScheduleChangeRequest,
  handleScheduleChangeProposalCommand,
  type ConnectProductApi,
} from "./schedule-change-requests.handler.ts";

const API = "https://api.futrob.test/api/v1";
const REQUEST_PATH = `${API}/encounters/encounter-1/schedule-change-requests/req-1`;

const accepted = {
  id: "req-1",
  organizationId: "org-1",
  competitionId: "competition-1",
  encounterId: "encounter-1",
  requestingTeamId: "team-home",
  initiatedByActorId: "actor-home-captain",
  scope: { type: "entire_encounter" },
  status: "accepted",
  version: 2,
  currentProposalId: "proposal-1",
  proposals: [
    {
      id: "proposal-1",
      proposedStartAt: "2099-01-15T23:00:00.000Z",
      proposedByActorId: "actor-home-captain",
      proposedByTeamId: "team-home",
      reason: "Home travel conflict",
      createdAt: "2026-10-01T12:00:00.000Z",
    },
  ],
  decisions: [
    {
      id: "decision-1",
      proposalId: "proposal-1",
      requestVersion: 1,
      kind: "consent",
      responder: { authority: "rival_team", teamId: "team-away" },
      actorId: "actor-away-captain",
      reason: null,
      createdAt: "2026-10-02T12:00:00.000Z",
    },
  ],
  application: {
    id: "application-1",
    proposalId: "proposal-1",
    requestVersion: 2,
    appliedByActorId: "actor-away-captain",
    previousEncounterStartAt: "2099-01-10T23:00:00.000Z",
    appliedEncounterStartAt: "2099-01-15T23:00:00.000Z",
    slots: [
      {
        officialSlot: 1,
        previousStartAt: "2099-01-10T23:00:00.000Z",
        appliedStartAt: "2099-01-15T23:00:00.000Z",
      },
    ],
    appliedAt: "2026-10-02T12:00:00.000Z",
  },
  createdAt: "2026-10-01T12:00:00.000Z",
  updatedAt: "2026-10-02T12:00:00.000Z",
};

interface SentRequest {
  readonly method: string;
  readonly url: string;
  readonly actor: string | null;
  readonly body: unknown;
}

/** A session for `actorId` whose product API answers with `respond`. */
function sessionOf(actorId: string, respond: (sent: SentRequest) => Response) {
  const sent: SentRequest[] = [];
  const connect: ConnectProductApi = async () => ({
    client: createProductApiClient({
      actorId: asActorId(actorId),
      internalJobSecret: "internal-secret",
      requestId: "00000000-0000-4000-8000-000000000001",
      baseUrl: API,
      fetchImpl: async (input, init) => {
        const headers = new Headers(init?.headers);
        const request = {
          method: init?.method ?? "GET",
          url: String(input),
          actor: headers.get("X-Futrob-Actor-Id"),
          body: typeof init?.body === "string" ? JSON.parse(init.body) : null,
        };
        sent.push(request);
        return respond(request);
      },
    }),
  });
  return { connect, sent };
}

function browserPost(body: unknown) {
  return new Request("https://app.futrob.test/api/v1/whatever", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const target = { encounterId: "encounter-1", requestId: "req-1", proposalId: "proposal-1" };

describe("schedule-change BFF", () => {
  it("answers as the session actor and forwards the caller's version and key", async () => {
    const session = sessionOf("actor-away-captain", () =>
      Response.json({ request: accepted, replayed: false }),
    );

    const response = await handleScheduleChangeProposalCommand(
      browserPost({
        expectedVersion: 1,
        commandKey: "away-accept",
        responder: { authority: "rival_team", teamId: "team-away" },
        actorId: "actor-organizer",
        role: "organizer",
      }),
      { ...target, command: "accept" },
      session.connect,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ request: accepted, replayed: false });
    expect(session.sent).toEqual([
      {
        method: "POST",
        url: `${REQUEST_PATH}/proposals/proposal-1/accept`,
        actor: "actor-away-captain",
        body: {
          expectedVersion: 1,
          commandKey: "away-accept",
          responder: { authority: "rival_team", teamId: "team-away" },
        },
      },
    ]);
  });

  it("passes a version conflict through with its status and code", async () => {
    const session = sessionOf("actor-away-captain", () =>
      Response.json(
        {
          code: "scheduling.schedule_change_version_conflict",
          messageKey: "errors.scheduling.schedule_change_version_conflict",
        },
        { status: 409 },
      ),
    );

    const response = await handleScheduleChangeProposalCommand(
      browserPost({
        expectedVersion: 1,
        commandKey: "away-reject",
        responder: { authority: "rival_team", teamId: "team-away" },
      }),
      { ...target, command: "reject" },
      session.connect,
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      code: "scheduling.schedule_change_version_conflict",
    });
    expect(session.sent).toHaveLength(1);
  });

  it("refuses a request without a session before reaching the product API", async () => {
    const body = {
      expectedVersion: 1,
      commandKey: "away-counter",
      teamId: "team-away",
      proposedWallTime: { year: 2099, month: 1, day: 16, hour: 18, minute: 0, second: 0 },
      reason: "Away cup final",
    };
    const session = sessionOf("actor-away-captain", () =>
      Response.json({ request: accepted, replayed: false }),
    );
    const anonymous: ConnectProductApi = () => Promise.reject(new AuthUnauthenticatedError());

    const refused = await handleScheduleChangeProposalCommand(
      browserPost(body),
      { ...target, command: "counter" },
      anonymous,
    );
    const allowed = await handleScheduleChangeProposalCommand(
      browserPost(body),
      { ...target, command: "counter" },
      session.connect,
    );

    expect(refused.status).toBe(401);
    expect(await refused.json()).toMatchObject({ code: "auth.unauthenticated" });
    expect(allowed.status).toBe(200);
    expect(session.sent.map((request) => request.url)).toEqual([
      `${REQUEST_PATH}/proposals/proposal-1/counter`,
    ]);
  });

  it("rejects an invalid body or unknown command without calling the product API", async () => {
    const session = sessionOf("actor-away-captain", () =>
      Response.json({ request: accepted, replayed: false }),
    );

    const invalid = await handleScheduleChangeProposalCommand(
      browserPost({ expectedVersion: 1, responder: { authority: "organizer" } }),
      { ...target, command: "accept" },
      session.connect,
    );
    const unknown = await handleScheduleChangeProposalCommand(
      browserPost({ expectedVersion: 1, commandKey: "k", responder: { authority: "organizer" } }),
      { ...target, command: "approve" },
      session.connect,
    );

    expect([invalid.status, unknown.status]).toEqual([400, 404]);
    expect(await invalid.json()).toMatchObject({ code: "api.validation_error" });
    expect(session.sent).toEqual([]);
  });

  it("reads one request as the session actor", async () => {
    const session = sessionOf("actor-away-player", () => Response.json(accepted));

    const response = await handleGetScheduleChangeRequest(
      new Request("https://app.futrob.test/api/v1/whatever"),
      { encounterId: "encounter-1", requestId: "req-1" },
      session.connect,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(accepted);
    expect(session.sent).toEqual([
      { method: "GET", url: REQUEST_PATH, actor: "actor-away-player", body: null },
    ]);
  });
});
