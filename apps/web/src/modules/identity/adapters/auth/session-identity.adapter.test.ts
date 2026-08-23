import { z } from "zod";
import { describe, expect, it } from "vite-plus/test";
import { CREDENTIAL_IDENTITY_PROVIDER } from "@futrob/identity";
import { requireAuthenticatedActor, AuthUnauthenticatedError } from "@/context/auth.ts";
import { createSessionIdentityAdapter } from "./session-identity.adapter.ts";
import {
  createMemoryActorProvisioner,
  createMemoryAuth,
  createMemorySessionIdentity,
} from "./test-auth.ts";

describe("Better Auth email/password session → ActorId", () => {
  it("signs up, signs in, resolves session to a stable ActorId", async () => {
    const provisioner = createMemoryActorProvisioner();
    const { auth, sessionIdentity } = createMemorySessionIdentity({
      actorProvisioner: provisioner,
    });

    const email = `captain-${crypto.randomUUID()}@futrob.test`;
    const password = "password-at-least-8";

    const signedUp = await auth.api.signUpEmail({
      body: { email, password, name: "Captain" },
    });
    expect(signedUp.user.email).toBe(email);
    expect(provisioner.store.size).toBe(1);

    const signedIn = await auth.api.signInEmail({
      body: { email, password },
    });
    expect(signedIn.user.id).toBe(signedUp.user.id);

    const headers = await sessionHeadersFromSignIn(auth, email, password);
    const session = await auth.api.getSession({ headers });
    expect(session?.user.id).toBe(signedUp.user.id);

    const actorId = await requireAuthenticatedActor(sessionIdentity, headers);
    expect(actorId).toMatch(/^actor_/);

    const again = await requireAuthenticatedActor(sessionIdentity, headers);
    expect(again).toBe(actorId);
    expect(provisioner.store.size).toBe(1);
  });

  it("throws AuthUnauthenticatedError when the session has no provisioned actor", async () => {
    const provisioner = createMemoryActorProvisioner();
    const auth = createMemoryAuth({});
    const sessionIdentity = createSessionIdentityAdapter({
      auth,
      findActorId: async (userId) =>
        provisioner.store.get(`${CREDENTIAL_IDENTITY_PROVIDER}:${userId}`) ?? null,
    });

    const email = `orphan-${crypto.randomUUID()}@futrob.test`;
    const password = "password-at-least-8";
    await auth.api.signUpEmail({
      body: { email, password, name: "Orphan" },
    });
    const headers = await sessionHeadersFromSignIn(auth, email, password);

    await expect(requireAuthenticatedActor(sessionIdentity, headers)).rejects.toBeInstanceOf(
      AuthUnauthenticatedError,
    );
  });

  it("throws AuthUnauthenticatedError without a session", async () => {
    const provisioner = createMemoryActorProvisioner();
    const { sessionIdentity } = createMemorySessionIdentity({
      actorProvisioner: provisioner,
    });

    await expect(requireAuthenticatedActor(sessionIdentity, new Headers())).rejects.toBeInstanceOf(
      AuthUnauthenticatedError,
    );
  });

  it("uses the secure session cookie contract for the production origin", async () => {
    const auth = createMemoryAuth({ baseURL: "https://futrob.app" });
    const response = await auth.handler(
      new Request("https://futrob.app/api/auth/sign-up/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: `secure-cookie-${crypto.randomUUID()}@futrob.test`,
          password: "password-at-least-8",
          name: "Secure cookie",
        }),
      }),
    );

    expect(response.ok).toBe(true);
    expect(response.headers.get("set-cookie")).toContain("__Secure-better-auth.session_token=");
  });

  it("exposes sign-up, sign-in, and get-session via auth.handler", async () => {
    const provisioner = createMemoryActorProvisioner();
    const { auth } = createMemorySessionIdentity({ actorProvisioner: provisioner });
    const email = `handler-${crypto.randomUUID()}@futrob.test`;
    const password = "password-at-least-8";

    const signUp = await auth.handler(
      new Request("http://localhost:3000/api/auth/sign-up/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, name: "Handler" }),
      }),
    );
    expect(signUp.status).toBe(200);

    const signIn = await auth.handler(
      new Request("http://localhost:3000/api/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      }),
    );
    expect(signIn.ok).toBe(true);

    const sessionRes = await auth.handler(
      new Request("http://localhost:3000/api/auth/get-session", {
        method: "GET",
        headers: cookieHeadersFrom(signIn),
      }),
    );
    expect(sessionRes.ok).toBe(true);
    const sessionBodySchema = z
      .object({ user: z.object({ email: z.string() }).optional() })
      .nullable();
    const body = sessionBodySchema.parse(await sessionRes.json());
    expect(body?.user?.email).toBe(email);
  });
});

async function sessionHeadersFromSignIn(
  auth: ReturnType<typeof createMemoryAuth>,
  email: string,
  password: string,
): Promise<Headers> {
  const response = await auth.handler(
    new Request("http://localhost:3000/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),
  );
  expect(response.ok).toBe(true);
  return cookieHeadersFrom(response);
}

function cookieHeadersFrom(response: Response): Headers {
  const headers = new Headers();
  const setCookie = response.headers.getSetCookie?.() ?? [];
  if (setCookie.length > 0) {
    headers.set("cookie", setCookie.map((c) => c.split(";")[0]).join("; "));
    return headers;
  }
  const single = response.headers.get("set-cookie");
  if (single) {
    headers.set("cookie", single.split(";")[0] ?? single);
  }
  return headers;
}
