import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { getWorkerBindings } from "@/modules/identity/server/worker-bindings.ts";
import {
  getTeamOfficialSelection,
  proposeOfficialSelection,
  confirmOfficialSelection,
  rejectOfficialSelection,
  proposeAlternativeOfficialSelection,
  openMatchDispute,
} from "./official-selection.ts";

vi.mock("@/modules/identity/server/worker-bindings.ts", () => ({ getWorkerBindings: vi.fn() }));

const scope = { organizationId: "org-1", encounterId: "enc-1" };
const proposalScope = { ...scope, proposalId: "proposal-1" };
const selection = {
  id: "selection-1",
  ...scope,
  competitionId: "comp-1",
  status: "awaiting_opponent_confirmation",
  version: 1,
  round: 1,
  currentProposalId: "proposal-1",
  createdAt: "2026-10-06T12:00:00.000Z",
  updatedAt: "2026-10-06T12:00:00.000Z",
};
const proposal = {
  id: "proposal-1",
  round: 1,
  sequence: 1,
  proposingTeamId: "home",
  proposedByActorId: "captain-home",
  slots: [
    { officialSlot: 1, providerMatchRef: { providerKey: "ea-clubs", externalId: "match-1" } },
  ],
  supersedesProposalId: null,
  reason: null,
  createdAt: "2026-10-06T12:00:00.000Z",
  confirmationDeadline: "2026-10-07T12:00:00.000Z",
};
const outcome = {
  selection,
  proposal,
  actions: [],
  dispute: null,
  approvedResult: null,
  integrityFlags: [],
  replayed: false,
};
const requestId = "93dde399-c036-4fca-a479-73c4f3f093a0";
function incoming(session: string | null, body?: unknown, query = "?actingTeamId=away") {
  const headers = new Headers({ "X-Request-Id": requestId, "X-Futrob-Actor-Id": "captain-away" });
  if (session) headers.set("Cookie", `session=${session}`);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  return new Request(
    `https://web.example/api/v1/organizations/org-1/encounters/enc-1/official-selection${query}`,
    {
      method: body === undefined ? "GET" : "POST",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    },
  );
}

describe("authenticated official-selection BFF over HTTP", () => {
  let server: Server;
  let version: number;
  let state: string;
  let receipts: Map<string, Record<string, unknown>>;
  let received: { path: string; actor: string; body: unknown; requestId: string }[];
  beforeEach(async () => {
    version = 1;
    state = "awaiting_opponent_confirmation";
    receipts = new Map();
    received = [];
    server = createServer(async (req, res) => {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const text = Buffer.concat(chunks).toString();
      const body = text ? JSON.parse(text) : null;
      const actor = String(req.headers["x-futrob-actor-id"]);
      received.push({
        path: req.url ?? "",
        actor,
        body,
        requestId: String(req.headers["x-request-id"]),
      });
      const reply = (status: number, data: unknown) => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(data));
      };
      const failure = (status: number, code: string) =>
        reply(status, {
          code,
          messageKey: `errors.${code}`,
          reason: "private@example.com",
          rawEa: { secret: "raw" },
        });
      if (req.headers.authorization !== "Bearer service-secret")
        return failure(401, "api.unauthorized");
      if (actor === "foreign-captain") return failure(403, "results.official_selection_forbidden");
      if (req.method === "GET")
        return reply(200, {
          encounterId: "enc-1",
          selection: { ...selection, version, status: state },
          proposals: [proposal],
          actions: [],
          disputes: [],
          activeDispute: null,
          approvedResultId: state === "approved" ? "result-1" : null,
          integrityFlags: [],
          allowedActions:
            state === "approved"
              ? []
              : ["confirm", "reject", "propose_alternative", "open_dispute"],
          rawEa: { secret: "raw" },
        });
      if (actor === "captain-home" && body.actingTeamId === "away")
        return failure(403, "results.official_selection_forbidden");
      const receipt = receipts.get(body.commandKey);
      if (receipt) return reply(200, { ...receipt, replayed: true });
      if (body.expectedVersion !== version)
        return failure(409, "results.selection_version_conflict");
      version += 1;
      state = req.url?.endsWith("/confirm") ? "approved" : "disputed";
      const result = {
        ...outcome,
        selection: { ...selection, status: state, version },
        approvedResult:
          state === "approved"
            ? {
                id: "result-1",
                revision: 1,
                status: "approved",
                approvalBasis: "team_agreement",
                proposalId: "proposal-1",
                approvedAt: "2026-10-06T13:00:00.000Z",
              }
            : null,
        rawEa: { secret: "raw" },
        requestFingerprint: "private-receipt",
      };
      receipts.set(body.commandKey, result);
      reply(200, result);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("HTTP harness did not bind");
    vi.mocked(getWorkerBindings).mockResolvedValue({
      HYPERDRIVE: { connectionString: "postgres://unused-in-http-test" },
      APP_BASE_URL: "https://web.example",
      BETTER_AUTH_SECRET: "a-long-auth-secret-for-the-test-harness",
      INTERNAL_JOB_SECRET: "service-secret",
      FUTROB_API_BASE_URL: `http://127.0.0.1:${address.port}/api/v1`,
      AUTH_SERVICE: {
        fetch: async (request: Request) => {
          const cookie = request.headers.get("cookie");
          return Response.json(
            cookie
              ? {
                  actorId:
                    cookie === "session=foreign"
                      ? "foreign-captain"
                      : cookie === "session=home"
                        ? "captain-home"
                        : "captain-away",
                }
              : null,
          );
        },
      },
    });
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });

  it("authenticates the read, denies a foreign session, and returns only the published view", async () => {
    const denied = await getTeamOfficialSelection(incoming("foreign"), scope);
    expect(denied.status).toBe(403);
    expect(await denied.json()).toEqual({
      code: "results.official_selection_forbidden",
      messageKey: "errors.results.official_selection_forbidden",
      requestId,
    });
    const response = await getTeamOfficialSelection(incoming("away"), scope);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-request-id")).toBe(requestId);
    expect(await response.json()).toEqual({
      encounterId: "enc-1",
      selection: { ...selection, version: 1 },
      proposals: [proposal],
      actions: [],
      disputes: [],
      activeDispute: null,
      approvedResultId: null,
      integrityFlags: [],
      allowedActions: ["confirm", "reject", "propose_alternative", "open_dispute"],
    });
    expect(received.map(({ actor, path }) => ({ actor, path }))).toEqual([
      {
        actor: "foreign-captain",
        path: "/api/v1/organizations/org-1/encounters/enc-1/official-selection?actingTeamId=away",
      },
      {
        actor: "captain-away",
        path: "/api/v1/organizations/org-1/encounters/enc-1/official-selection?actingTeamId=away",
      },
    ]);
  });

  it("no session and forged authority leave the selection unchanged; the opponent confirms once", async () => {
    const body = {
      actingTeamId: "away",
      expectedVersion: 1,
      commandKey: "confirm-once",
      actorId: "captain-away",
      role: "organizer",
    };
    const absent = await confirmOfficialSelection(incoming(null, body), proposalScope);
    expect(absent.status).toBe(401);
    expect(await absent.json()).toEqual({
      code: "auth.unauthenticated",
      messageKey: "errors.auth.unauthenticated",
      requestId,
    });
    const forged = await confirmOfficialSelection(incoming("home", body), proposalScope);
    expect(forged.status).toBe(403);
    expect(await forged.json()).toEqual({
      code: "results.official_selection_forbidden",
      messageKey: "errors.results.official_selection_forbidden",
      requestId,
    });
    const unchanged = await getTeamOfficialSelection(incoming("away"), scope);
    expect(await unchanged.json()).toMatchObject({
      selection: { status: "awaiting_opponent_confirmation", version: 1 },
      approvedResultId: null,
    });
    const approved = await confirmOfficialSelection(incoming("away", body), proposalScope);
    expect(approved.status).toBe(200);
    expect(await approved.json()).toMatchObject({
      selection: { status: "approved", version: 2 },
      approvedResult: { id: "result-1", revision: 1 },
      replayed: false,
    });
    const replay = await confirmOfficialSelection(incoming("away", body), proposalScope);
    expect(await replay.json()).toMatchObject({
      selection: { status: "approved", version: 2 },
      approvedResult: { id: "result-1", revision: 1 },
      replayed: true,
    });
    const after = await getTeamOfficialSelection(incoming("away"), scope);
    expect(await after.json()).toMatchObject({
      selection: { status: "approved", version: 2 },
      approvedResultId: "result-1",
      allowedActions: [],
    });
    expect(receipts.size).toBe(1);
    expect(received.filter(({ body }) => body !== null)).toEqual([
      {
        path: "/api/v1/organizations/org-1/encounters/enc-1/official-selection/proposals/proposal-1/confirm",
        actor: "captain-home",
        requestId,
        body: { actingTeamId: "away", expectedVersion: 1, commandKey: "confirm-once" },
      },
      {
        path: "/api/v1/organizations/org-1/encounters/enc-1/official-selection/proposals/proposal-1/confirm",
        actor: "captain-away",
        requestId,
        body: { actingTeamId: "away", expectedVersion: 1, commandKey: "confirm-once" },
      },
      {
        path: "/api/v1/organizations/org-1/encounters/enc-1/official-selection/proposals/proposal-1/confirm",
        actor: "captain-away",
        requestId,
        body: { actingTeamId: "away", expectedVersion: 1, commandKey: "confirm-once" },
      },
    ]);
  });

  it("preserves version conflict and does not retry; a neighboring version completes", async () => {
    const stale = await confirmOfficialSelection(
      incoming("away", { actingTeamId: "away", expectedVersion: 0, commandKey: "stale" }),
      proposalScope,
    );
    expect(stale.status).toBe(409);
    expect(await stale.json()).toEqual({
      code: "results.selection_version_conflict",
      messageKey: "errors.results.selection_version_conflict",
      requestId,
    });
    expect(received).toMatchObject([{ body: { expectedVersion: 0, commandKey: "stale" } }]);
    expect(received.length).toBe(1);
    const valid = await confirmOfficialSelection(
      incoming("away", { actingTeamId: "away", expectedVersion: 1, commandKey: "valid" }),
      proposalScope,
    );
    expect(await valid.json()).toMatchObject({ selection: { version: 2, status: "approved" } });
  });

  it.each([
    [
      "propose",
      proposeOfficialSelection,
      scope,
      "/proposals",
      {
        selections: [
          { officialSlot: 1, providerMatchRef: { providerKey: "ea-clubs", externalId: "match-1" } },
        ],
      },
    ],
    [
      "reject",
      rejectOfficialSelection,
      proposalScope,
      "/proposals/proposal-1/reject",
      { reason: "Wrong match" },
    ],
    [
      "alternative",
      proposeAlternativeOfficialSelection,
      proposalScope,
      "/proposals/proposal-1/alternative",
      {
        reason: "Other match",
        selections: [
          { officialSlot: 1, providerMatchRef: { providerKey: "manual", externalId: "match-2" } },
        ],
      },
    ],
    ["dispute", openMatchDispute, scope, "/disputes", { reason: "Wrong score" }],
  ] as const)(
    "forwards %s to its published endpoint and returns its parsed result",
    async (_name, handler, params, suffix, extra) => {
      const body = {
        actingTeamId: "away",
        expectedVersion: 1,
        commandKey: "command-key",
        ...extra,
      };
      const response = await handler(incoming("away", body), {
        ...params,
        proposalId: "proposal-1",
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        ...outcome,
        selection: { ...selection, status: "disputed", version: 2 },
      });
      expect(received).toEqual([
        {
          path: `/api/v1/organizations/org-1/encounters/enc-1/official-selection${suffix}`,
          actor: "captain-away",
          body,
          requestId,
        },
      ]);
    },
  );

  it("rejects invalid inputs without leaking their contents, while a valid command succeeds", async () => {
    const invalid = await openMatchDispute(
      incoming("away", {
        actingTeamId: "away",
        expectedVersion: -1,
        commandKey: "bad",
        reason: "secret@example.com",
      }),
      scope,
    );
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({
      code: "api.validation_error",
      messageKey: "errors.api.validation_error",
      requestId,
    });
    const missingTeam = await getTeamOfficialSelection(incoming("away", undefined, ""), scope);
    expect(missingTeam.status).toBe(400);
    expect(received).toEqual([]);
    const valid = await openMatchDispute(
      incoming("away", {
        actingTeamId: "away",
        expectedVersion: 1,
        commandKey: "valid",
        reason: "Wrong score",
      }),
      scope,
    );
    expect(await valid.json()).toMatchObject({
      selection: { status: "disputed", version: 2 },
      replayed: false,
    });
  });
});
