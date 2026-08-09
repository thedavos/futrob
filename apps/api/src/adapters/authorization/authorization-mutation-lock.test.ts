import { asActorId, asOrganizationId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { InMemoryAuthorizationMutationLock } from "./in-memory.repository.ts";

describe("InMemoryAuthorizationMutationLock", () => {
  it("serializes concurrent privilege mutations for the same actor", async () => {
    const lock = new InMemoryAuthorizationMutationLock();
    const organizationId = asOrganizationId("org-1");
    const actorId = asActorId("actor-1");
    const entered: string[] = [];
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = lock.runWithActors(organizationId, [actorId], async () => {
      entered.push("first");
      await firstGate;
    });
    await Promise.resolve();
    const second = lock.runWithActors(organizationId, [actorId], async () => {
      entered.push("second");
    });
    await Promise.resolve();

    expect(entered).toEqual(["first"]);
    releaseFirst();
    await Promise.all([first, second]);
    expect(entered).toEqual(["first", "second"]);
  });
});
