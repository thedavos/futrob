import { describe, expect, it, vi } from "vite-plus/test";
import type { ActorProvisionerPort } from "@futrob/identity";
import { CREDENTIAL_IDENTITY_PROVIDER } from "@futrob/identity";
import { asActorId } from "@futrob/shared-kernel";
import { createActorProvisioningHooks } from "./better-auth.ts";

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
