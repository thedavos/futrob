import { describe, expect, it } from "vite-plus/test";
import { AuthServiceMisconfiguredError, AuthUnauthenticatedError } from "./auth-errors.ts";
import { resolveAuthenticatedRequestActor } from "./authenticated-request-actor.ts";

const request = new Request("http://localhost:3000/api/v1/players/me", {
  headers: { cookie: "better-auth.session_token=abc" },
});

function sessionService(body: unknown, status = 200) {
  return { fetch: async () => new Response(JSON.stringify(body), { status }) };
}

describe("resolveAuthenticatedRequestActor", () => {
  it("returns the actor id carried by get-session", async () => {
    const actorId = await resolveAuthenticatedRequestActor({
      request,
      authService: sessionService({ user: { id: "user-1" }, actorId: "actor-1" }),
    });
    expect(actorId).toBe("actor-1");
  });

  it("rejects a request without a session", async () => {
    await expect(
      resolveAuthenticatedRequestActor({ request, authService: sessionService(null) }),
    ).rejects.toBeInstanceOf(AuthUnauthenticatedError);
  });

  it("rejects a session whose user has no provisioned actor", async () => {
    await expect(
      resolveAuthenticatedRequestActor({
        request,
        authService: sessionService({ user: { id: "user-1" }, actorId: null }),
      }),
    ).rejects.toBeInstanceOf(AuthUnauthenticatedError);
  });

  it("fails when the AUTH_SERVICE binding is missing", async () => {
    await expect(
      resolveAuthenticatedRequestActor({ request, authService: undefined }),
    ).rejects.toBeInstanceOf(AuthServiceMisconfiguredError);
  });
});
