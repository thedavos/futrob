import { describe, expect, it } from "vite-plus/test";
import { FutrobApiError } from "@futrob/sdk";
import { handleListAccessGrantsRequest } from "./-grants.handler.ts";

const URL_BASE = "https://app.futrob.test/api/v1/authorization/grants";

describe("access grants BFF", () => {
  it("forwards the scoped query and returns the grants", async () => {
    const calls: unknown[] = [];
    const response = await handleListAccessGrantsRequest(
      new Request(
        `${URL_BASE}?organizationId=org-1&scopeType=organization&scopeId=org-1&targetActorId=actor-2`,
      ),
      {
        load: async (query) => {
          calls.push(query);
          return { grants: [] };
        },
      },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ grants: [] });
    expect(calls).toEqual([
      {
        organizationId: "org-1",
        scopeType: "organization",
        scopeId: "org-1",
        targetActorId: "actor-2",
      },
    ]);
  });

  it("rejects a query without a scope", async () => {
    let calls = 0;
    const response = await handleListAccessGrantsRequest(
      new Request(`${URL_BASE}?organizationId=org-1`),
      {
        load: async () => {
          calls += 1;
          return { grants: [] };
        },
      },
    );

    expect(response.status).toBe(400);
    expect(calls).toBe(0);
  });

  it("preserves a product API denial", async () => {
    const response = await handleListAccessGrantsRequest(
      new Request(`${URL_BASE}?organizationId=org-1&scopeType=organization&scopeId=org-1`),
      {
        load: async () => {
          throw new FutrobApiError({
            status: 403,
            body: { code: "authorization.forbidden", messageKey: "errors.authorization.forbidden" },
          });
        },
      },
    );

    expect(response.status).toBe(403);
  });
});
