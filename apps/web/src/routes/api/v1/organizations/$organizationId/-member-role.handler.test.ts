import { describe, expect, it } from "vite-plus/test";
import { FutrobApiError } from "@futrob/sdk";
import { handleChangeMemberRoleRequest } from "./-member-role.handler.ts";

const URL = "https://app.futrob.test/api/v1/organizations/org-1/members/actor-2/role";

function patch(body: unknown): Request {
  return new Request(URL, { method: "PATCH", body: JSON.stringify(body) });
}

describe("member role BFF", () => {
  it("forwards a valid role change and returns the assignment", async () => {
    const calls: unknown[] = [];
    const response = await handleChangeMemberRoleRequest(patch({ role: "staff" }), {
      change: async (input) => {
        calls.push(input);
        return {
          organizationId: "org-1",
          actorId: "actor-2",
          role: "staff",
          createdAt: "2026-10-20T12:00:00.000Z",
        };
      },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ actorId: "actor-2", role: "staff" });
    expect(calls).toEqual([{ role: "staff" }]);
  });

  it("rejects an unknown role without calling the product API", async () => {
    let calls = 0;
    const response = await handleChangeMemberRoleRequest(patch({ role: "owner" }), {
      change: async () => {
        calls += 1;
        throw new Error("unreachable");
      },
    });

    expect(response.status).toBe(400);
    expect(calls).toBe(0);
  });

  it("preserves the product API conflict for the last organizer", async () => {
    const response = await handleChangeMemberRoleRequest(patch({ role: "member" }), {
      change: async () => {
        throw new FutrobApiError({
          status: 409,
          body: {
            code: "authorization.last_organizer",
            messageKey: "errors.authorization.last_organizer",
          },
        });
      },
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "authorization.last_organizer" });
  });
});
