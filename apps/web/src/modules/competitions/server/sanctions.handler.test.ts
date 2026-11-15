import { describe, expect, it } from "vite-plus/test";
import { asActorId } from "@futrob/shared-kernel";
import { AuthUnauthenticatedError } from "@/context/auth.ts";
import { createProductApiClient } from "@/context/product-api-client.ts";
import {
  handleImposeSanction,
  handleListTeamSanctions,
  handleRevokeSanction,
  type ConnectProductApi,
} from "./sanctions.handler.ts";

const API = "https://api.futrob.test/api/v1";
const COMPETITION = `${API}/organizations/org-1/competitions/cmp-1`;
const params = { organizationId: "org-1", competitionId: "cmp-1" };

const sanction = {
  id: "san-1",
  competitionId: "cmp-1",
  targetType: "team",
  teamId: "team-1",
  teamName: "Cóndor FC",
  playerProfileId: null,
  playerName: null,
  type: "warning",
  pointsDeducted: null,
  suspensionMatches: null,
  encounterId: null,
  reason: "Retraso en el inicio",
  imposedByActorId: "actor-organizer",
  imposedAt: "2026-11-10T12:00:00.000Z",
  requestId: "req-1",
  revocation: null,
};

interface SentRequest {
  readonly method: string;
  readonly url: string;
  readonly actor: string | null;
  readonly body: unknown;
}

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

function browser(method: string, body?: unknown) {
  return new Request("https://app.futrob.test/api/v1/whatever", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("sanctions BFF", () => {
  it("imposes as the session actor and drops fields the browser cannot set", async () => {
    const session = sessionOf("actor-organizer", () => Response.json(sanction, { status: 201 }));

    const response = await handleImposeSanction(
      browser("POST", {
        target: { type: "team", teamId: "team-1" },
        type: "warning",
        reason: "Retraso en el inicio",
        imposedByActorId: "actor-someone-else",
      }),
      params,
      session.connect,
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(sanction);
    expect(session.sent).toEqual([
      {
        method: "POST",
        url: `${COMPETITION}/sanctions`,
        actor: "actor-organizer",
        body: {
          target: { type: "team", teamId: "team-1" },
          type: "warning",
          reason: "Retraso en el inicio",
        },
      },
    ]);
  });

  it("passes the product API's 403 through when the actor may not revoke", async () => {
    const session = sessionOf("actor-player", () =>
      Response.json(
        { code: "authorization.denied", messageKey: "errors.authorization.denied" },
        { status: 403 },
      ),
    );

    const response = await handleRevokeSanction(
      browser("POST", { reason: "Apelación aceptada" }),
      { ...params, sanctionId: "san-1" },
      session.connect,
    );

    expect(response.status).toBe(403);
    expect(session.sent.map((sent) => sent.url)).toEqual([`${COMPETITION}/sanctions/san-1/revoke`]);
  });

  it("rejects a revoke without a reason before reaching the product API", async () => {
    const session = sessionOf("actor-organizer", () => Response.json(sanction));

    const response = await handleRevokeSanction(
      browser("POST", { reason: "" }),
      { ...params, sanctionId: "san-1" },
      session.connect,
    );

    expect(response.status).toBe(400);
    expect(session.sent).toEqual([]);
  });

  it("refuses a Team's sanctions without a session", async () => {
    const anonymous: ConnectProductApi = () => Promise.reject(new AuthUnauthenticatedError());

    const response = await handleListTeamSanctions(
      browser("GET"),
      { ...params, teamId: "team-1" },
      anonymous,
    );

    expect(response.status).toBe(401);
  });
});
