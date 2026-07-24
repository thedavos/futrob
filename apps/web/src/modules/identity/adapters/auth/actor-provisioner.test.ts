import { describe, expect, it } from "vite-plus/test";
import { asActorId } from "@futrob/shared-kernel";
import { CREDENTIAL_IDENTITY_PROVIDER } from "@futrob/identity";
import { createMemoryActorProvisioner } from "./test-auth.ts";

describe("createMemoryActorProvisioner", () => {
  it("is idempotent for the same provider subject", async () => {
    const provisioner = createMemoryActorProvisioner();
    const first = await provisioner.ensureActorForSubject({
      provider: CREDENTIAL_IDENTITY_PROVIDER,
      subject: "user-1",
    });
    const second = await provisioner.ensureActorForSubject({
      provider: CREDENTIAL_IDENTITY_PROVIDER,
      subject: "user-1",
    });
    expect(first).toBe(second);
    expect(first).toEqual(asActorId("actor_1"));
  });

  it("allocates distinct actors for distinct subjects", async () => {
    const provisioner = createMemoryActorProvisioner();
    const a = await provisioner.ensureActorForSubject({
      provider: CREDENTIAL_IDENTITY_PROVIDER,
      subject: "user-a",
    });
    const b = await provisioner.ensureActorForSubject({
      provider: CREDENTIAL_IDENTITY_PROVIDER,
      subject: "user-b",
    });
    expect(a).not.toBe(b);
  });
});
