/// <reference types="node" />
import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { createFutrobClient } from "../client.ts";
import { FutrobApiError } from "../errors.ts";

const selection = {
  id: "selection-1",
  encounterId: "enc/1",
  organizationId: "org/1",
  competitionId: "comp-1",
  status: "awaiting_opponent_confirmation",
  version: 1,
  round: 1,
  currentProposalId: "proposal/1",
  createdAt: "2026-10-06T12:00:00.000Z",
  updatedAt: "2026-10-06T12:00:00.000Z",
};
const proposal = {
  id: "proposal/1",
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
const view = {
  encounterId: "enc/1",
  selection,
  proposals: [proposal],
  actions: [],
  disputes: [],
  activeDispute: null,
  approvedResultId: null,
  integrityFlags: [],
  allowedActions: ["confirm", "reject", "propose_alternative", "open_dispute"],
};

// This HTTP peer checks the wire independently; it does not emulate Results policy.
describe("official-selection SDK over HTTP", () => {
  let server: Server;
  let baseUrl: string;
  let requests: { path: string; method: string; body: unknown; marker?: string }[];
  let reply: (path: string, body: unknown) => { status: number; data: unknown };
  beforeEach(async () => {
    requests = [];
    reply = (path) => ({ status: 200, data: path.includes("?") ? view : outcome });
    server = createServer(async (req, res) => {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const text = Buffer.concat(chunks).toString();
      const body: unknown = text ? JSON.parse(text) : null;
      requests.push({
        path: req.url ?? "",
        method: req.method ?? "",
        body,
        marker: req.headers["x-marker"] as string | undefined,
      });
      const response = reply(req.url ?? "", body);
      res.writeHead(response.status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(response.data));
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("HTTP harness did not bind");
    baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
  });
  afterEach(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });

  it("reads the exact Team scope and preserves proposal version and deadline", async () => {
    const client = createFutrobClient({ baseUrl });
    const result = await client.results.getTeamOfficialSelection(
      "org/1",
      "enc/1",
      { actingTeamId: "away +1" },
      { headers: { "X-Marker": "read" } },
    );
    expect(requests).toEqual([
      {
        path: "/api/v1/organizations/org%2F1/encounters/enc%2F1/official-selection?actingTeamId=away+%2B1",
        method: "GET",
        body: null,
        marker: "read",
      },
    ]);
    expect(result).toMatchObject({
      selection: { version: 1, currentProposalId: "proposal/1" },
      proposals: [{ id: "proposal/1", confirmationDeadline: "2026-10-07T12:00:00.000Z" }],
      allowedActions: ["confirm", "reject", "propose_alternative", "open_dispute"],
    });
  });

  it("sends all five published commands with exact keys, versions, proposals and inputs", async () => {
    const client = createFutrobClient({ baseUrl });
    const common = { actingTeamId: "away", expectedVersion: 1, commandKey: "key-1" };
    const options = { headers: { "X-Marker": "command" } };
    const proposed = await client.results.proposeOfficialSelection(
      "org/1",
      "enc/1",
      {
        ...common,
        selections: [
          { officialSlot: 1, providerMatchRef: { providerKey: "ea-clubs", externalId: "match-1" } },
        ],
      },
      options,
    );
    expect(proposed).toMatchObject({
      selection: { status: "awaiting_opponent_confirmation", version: 1 },
      proposal: { id: "proposal/1" },
      replayed: false,
    });
    await client.results.confirmOfficialSelection("org/1", "enc/1", "proposal/1", common, options);
    await client.results.rejectOfficialSelection(
      "org/1",
      "enc/1",
      "proposal/1",
      { ...common, reason: "Wrong match" },
      options,
    );
    await client.results.proposeAlternativeOfficialSelection(
      "org/1",
      "enc/1",
      "proposal/1",
      {
        ...common,
        reason: "Use second match",
        selections: [
          { officialSlot: 1, providerMatchRef: { providerKey: "manual", externalId: "match-2" } },
        ],
      },
      options,
    );
    await client.results.openMatchDispute(
      "org/1",
      "enc/1",
      { ...common, reason: "Wrong score" },
      options,
    );
    expect(
      requests.map(({ path, method, body, marker }) => ({
        path: path.split("official-selection")[1],
        method,
        body,
        marker,
      })),
    ).toEqual([
      {
        path: "/proposals",
        method: "POST",
        body: {
          actingTeamId: "away",
          expectedVersion: 1,
          commandKey: "key-1",
          selections: [
            {
              officialSlot: 1,
              providerMatchRef: { providerKey: "ea-clubs", externalId: "match-1" },
            },
          ],
        },
        marker: "command",
      },
      {
        path: "/proposals/proposal%2F1/confirm",
        method: "POST",
        body: { actingTeamId: "away", expectedVersion: 1, commandKey: "key-1" },
        marker: "command",
      },
      {
        path: "/proposals/proposal%2F1/reject",
        method: "POST",
        body: {
          actingTeamId: "away",
          expectedVersion: 1,
          commandKey: "key-1",
          reason: "Wrong match",
        },
        marker: "command",
      },
      {
        path: "/proposals/proposal%2F1/alternative",
        method: "POST",
        body: {
          actingTeamId: "away",
          expectedVersion: 1,
          commandKey: "key-1",
          reason: "Use second match",
          selections: [
            { officialSlot: 1, providerMatchRef: { providerKey: "manual", externalId: "match-2" } },
          ],
        },
        marker: "command",
      },
      {
        path: "/disputes",
        method: "POST",
        body: {
          actingTeamId: "away",
          expectedVersion: 1,
          commandKey: "key-1",
          reason: "Wrong score",
        },
        marker: "command",
      },
    ]);
  });

  it("executes confirmation with the caller version and key, then preserves replay", async () => {
    const receipts = new Map<string, Record<string, unknown>>();
    let version = 1;
    let approvals = 0;
    reply = (path, body) => {
      if (!path.endsWith("/proposals/proposal%2F1/confirm")) return { status: 404, data: {} };
      const command = body as { expectedVersion: number; commandKey: string };
      const receipt = receipts.get(command.commandKey);
      if (receipt) return { status: 200, data: { ...outcome, ...receipt, replayed: true } };
      if (command.expectedVersion !== version)
        return {
          status: 409,
          data: {
            code: "results.selection_version_conflict",
            messageKey: "errors.results.selection_version_conflict",
          },
        };
      version += 1;
      approvals += 1;
      const result = {
        ...outcome,
        selection: { ...selection, status: "approved", version },
        approvedResult: {
          id: "result-1",
          revision: 1,
          status: "approved",
          approvalBasis: "team_agreement",
          proposalId: "proposal/1",
          approvedAt: "2026-10-06T13:00:00.000Z",
        },
      };
      receipts.set(command.commandKey, result);
      return { status: 200, data: result };
    };
    const client = createFutrobClient({ baseUrl, maxRetries: 3 });
    const confirm = (expectedVersion: number, commandKey: string) =>
      client.results.confirmOfficialSelection("org/1", "enc/1", "proposal/1", {
        actingTeamId: "away",
        expectedVersion,
        commandKey,
      });
    await expect(confirm(0, "stale")).rejects.toMatchObject({
      status: 409,
      code: "results.selection_version_conflict",
    });
    expect(requests.length).toBe(1);
    expect(await confirm(1, "approve-once")).toMatchObject({
      selection: { status: "approved", version: 2 },
      approvedResult: { id: "result-1", revision: 1 },
      replayed: false,
    });
    expect(await confirm(1, "approve-once")).toMatchObject({
      selection: { version: 2 },
      approvedResult: { id: "result-1", revision: 1 },
      replayed: true,
    });
    expect(approvals).toBe(1);
    expect(requests.slice(1).map(({ body }) => body)).toEqual([
      { actingTeamId: "away", expectedVersion: 1, commandKey: "approve-once" },
      { actingTeamId: "away", expectedVersion: 1, commandKey: "approve-once" },
    ]);
  });

  it.each([
    [401, "auth.unauthenticated"],
    [403, "results.official_selection_forbidden"],
    [409, "results.confirmation_window_closed"],
  ])("propagates %s without recovery or another key", async (status, code) => {
    reply = () => ({ status, data: { code, messageKey: `errors.${code}` } });
    const client = createFutrobClient({ baseUrl, maxRetries: 3 });
    const error = await client.results
      .openMatchDispute("org/1", "enc/1", {
        actingTeamId: "away",
        expectedVersion: 1,
        commandKey: "keep-key",
        reason: "Wrong score",
      })
      .catch((failure: unknown) => failure);
    expect(error).toBeInstanceOf(FutrobApiError);
    expect(error).toMatchObject({ status, code });
    expect(requests).toMatchObject([{ body: { expectedVersion: 1, commandKey: "keep-key" } }]);
    expect(requests.length).toBe(1);
  });

  it("rejects invalid inputs and incompatible success responses, while a valid response succeeds", async () => {
    const client = createFutrobClient({ baseUrl });
    await expect(
      client.results.confirmOfficialSelection("org/1", "enc/1", "proposal/1", {
        actingTeamId: "away",
        expectedVersion: -1,
        commandKey: "invalid",
      }),
    ).rejects.toMatchObject({ name: "ZodError" });
    expect(requests).toEqual([]);
    reply = () => ({
      status: 200,
      data: { ...outcome, proposal: { ...proposal, confirmationDeadline: null } },
    });
    await expect(
      client.results.proposeOfficialSelection("org/1", "enc/1", {
        actingTeamId: "home",
        expectedVersion: 0,
        commandKey: "valid",
        selections: [
          { officialSlot: 1, providerMatchRef: { providerKey: "ea-clubs", externalId: "match-1" } },
        ],
      }),
    ).rejects.toMatchObject({ name: "ZodError" });
    reply = () => ({ status: 200, data: outcome });
    expect(
      await client.results.confirmOfficialSelection("org/1", "enc/1", "proposal/1", {
        actingTeamId: "away",
        expectedVersion: 1,
        commandKey: "valid",
      }),
    ).toMatchObject({
      proposal: { id: "proposal/1", confirmationDeadline: "2026-10-07T12:00:00.000Z" },
    });
  });
});
