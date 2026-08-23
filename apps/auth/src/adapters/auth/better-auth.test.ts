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
      .mockRejectedValueOnce(new Error("D1 unavailable"))
      .mockResolvedValue(asActorId("actor-1"));
    const hooks = createActorProvisioningHooks({ ensureActorForSubject });

    await expect(hooks.session.create.before({ userId: "user-1" })).rejects.toThrow(
      "D1 unavailable",
    );
    await expect(hooks.session.create.before({ userId: "user-1" })).resolves.toBeUndefined();
    expect(ensureActorForSubject).toHaveBeenCalledTimes(2);
  });
});
