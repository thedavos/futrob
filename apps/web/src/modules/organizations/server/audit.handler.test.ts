import { describe, expect, it } from "vite-plus/test";
import { asActorId } from "@futrob/shared-kernel";
import { createProductApiClient } from "@/context/product-api-client.ts";
import { handleListOrganizationAudit, type ConnectAuditApi } from "./audit.handler.ts";

const data = { entries: [], nextCursor: null };
function session(response: Response) {
  const sent: { url: string; actor: string | null }[] = [];
  const connect: ConnectAuditApi = async () => ({
    client: createProductApiClient({
      actorId: asActorId("trusted-organizer"),
      internalJobSecret: "test-job-secret",
      requestId: "00000000-0000-4000-8000-000000000001",
      baseUrl: "https://api.test/api/v1",
      fetchImpl: async (input, init) => {
        sent.push({
          url: String(input),
          actor: new Headers(init?.headers).get("X-Futrob-Actor-Id"),
        });
        return response;
      },
    }),
  });
  return { sent, connect };
}
describe("organization audit BFF", () => {
  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "refuses %s without contacting the product API",
    async (method) => {
      const current = session(Response.json(data));
      const response = await handleListOrganizationAudit(
        new Request("https://web.test/api/v1/organizations/org-1/audit", { method }),
        "org-1",
        current.connect,
      );
      expect(response.status).toBe(405);
      expect(response.headers.get("Allow")).toBe("GET");
      expect(current.sent).toEqual([]);
    },
  );
  it("forwards validated filters as the session actor", async () => {
    const current = session(Response.json(data));
    const response = await handleListOrganizationAudit(
      new Request(
        "https://web.test/api/v1/organizations/org-1/audit?competitionId=cmp-1&actorId=actor-1&action=sanctions.imposed&limit=10&cursor=next",
      ),
      "org-1",
      current.connect,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(data);
    expect(current.sent).toEqual([
      {
        url: "https://api.test/api/v1/organizations/org-1/audit?competitionId=cmp-1&actorId=actor-1&action=sanctions.imposed&cursor=next&limit=10",
        actor: "trusted-organizer",
      },
    ]);
  });
  it("preserves permission denial", async () => {
    const current = session(
      Response.json(
        { code: "authorization.forbidden", messageKey: "errors.authorization.forbidden" },
        { status: 403 },
      ),
    );
    const response = await handleListOrganizationAudit(
      new Request("https://web.test/api/v1/organizations/org-1/audit"),
      "org-1",
      current.connect,
    );
    expect(response.status).toBe(403);
  });
  it("rejects a reversed date range before calling the product API", async () => {
    const current = session(Response.json(data));
    const response = await handleListOrganizationAudit(
      new Request(
        "https://web.test/api/v1/organizations/org-1/audit?from=2026-11-10T00:00:00Z&to=2026-11-01T00:00:00Z",
      ),
      "org-1",
      current.connect,
    );
    expect(response.status).toBe(400);
    expect(current.sent).toEqual([]);
  });
});
