import { describe, expect, it, vi } from "vite-plus/test";
import { APIError } from "better-auth/api";
import type { ActorProvisionerPort } from "@futrob/identity";
import { CREDENTIAL_IDENTITY_PROVIDER } from "@futrob/identity";
import { asActorId } from "@futrob/shared-kernel";
import { createActorProvisioningHooks, createAuthErrorHandler } from "./better-auth.ts";

describe("createActorProvisioningHooks", () => {
  it("provisions the domain actor before Better Auth creates a session", async () => {
    const ensureActorForSubject = vi.fn(async () => asActorId("actor-1"));
    const provisioner: ActorProvisionerPort = { ensureActorForSubject };
    const hooks = createActorProvisioningHooks(provisioner);

    await hooks.session.create.before({ userId: "user-1" });

    expect(ensureActorForSubject).toHaveBeenCalledWith({
      provider: CREDENTIAL_IDENTITY_PROVIDER,
      subject: "user-1",
    });
  });

  it("allows a later sign-in to retry failed provisioning", async () => {
    const ensureActorForSubject = vi
      .fn<ActorProvisionerPort["ensureActorForSubject"]>()
      .mockRejectedValueOnce(new Error("database unavailable"))
      .mockResolvedValue(asActorId("actor-1"));
    const hooks = createActorProvisioningHooks({ ensureActorForSubject });

    await expect(hooks.session.create.before({ userId: "user-1" })).rejects.toThrow(
      "database unavailable",
    );
    await expect(hooks.session.create.before({ userId: "user-1" })).resolves.toBeUndefined();
    expect(ensureActorForSubject).toHaveBeenCalledTimes(2);
  });
});

it("synchronizes contacts after provisioning and after name or email updates", async () => {
  const events: string[] = [];
  const hooks = createActorProvisioningHooks(
    {
      ensureActorForSubject: async () => {
        events.push("provision");
        return asActorId("actor-1");
      },
    },
    {
      syncCredentialUser: async (userId) => {
        events.push(`contact:${userId}`);
      },
    },
  );
  await hooks.session.create.before({ userId: "user-1" });
  expect(events).toEqual(["provision", "contact:user-1"]);
  await hooks.user.update.after({ id: "user-1" });
  expect(events).toEqual(["provision", "contact:user-1", "contact:user-1"]);
});

it("does not issue a session when the contact projection fails", async () => {
  const hooks = createActorProvisioningHooks(
    { ensureActorForSubject: async () => asActorId("actor-1") },
    {
      syncCredentialUser: async () => {
        throw new Error("projection unavailable");
      },
    },
  );
  await expect(hooks.session.create.before({ userId: "user-1" })).rejects.toThrow(
    "projection unavailable",
  );
});

describe("createAuthErrorHandler", () => {
  it("reports endpoint defects that Better Auth turns into HTTP 500", () => {
    const reportDefect = vi.fn();
    const handler = createAuthErrorHandler(reportDefect);
    const defect = new Error("SYNTHETIC_DB_FAILURE");
    handler.onError(defect);
    handler.onError(new APIError("INTERNAL_SERVER_ERROR"));
    expect(reportDefect).toHaveBeenCalledTimes(2);
    expect(reportDefect).toHaveBeenCalledWith(defect);
  });

  it("ignores expected client errors such as wrong credentials", () => {
    const reportDefect = vi.fn();
    const handler = createAuthErrorHandler(reportDefect);
    handler.onError(
      new APIError("UNAUTHORIZED", {
        code: "INVALID_EMAIL_OR_PASSWORD",
        message: "Invalid email or password",
      }),
    );
    handler.onError(new APIError("TOO_MANY_REQUESTS"));
    expect(reportDefect).not.toHaveBeenCalled();
  });
});
