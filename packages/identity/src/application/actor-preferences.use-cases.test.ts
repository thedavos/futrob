import { asActorId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import type { ActorPreferencesPort } from "../domain/ports/actor-preferences.port.ts";
import type {
  ActorPreferences,
  ActorPreferencesUpdate,
} from "../domain/value-objects/actor-preferences.ts";
import { GetActorPreferencesUseCase } from "./get-actor-preferences/get-actor-preferences.use-case.ts";
import { SaveActorPreferencesUseCase } from "./save-actor-preferences/save-actor-preferences.use-case.ts";

function fakePreferences() {
  const byActor = new Map<string, ActorPreferences>();
  const port: ActorPreferencesPort = {
    findByActor: async (actorId) => byActor.get(actorId) ?? null,
    save: async ({ actorId, sidebarLayout }: ActorPreferencesUpdate) => {
      byActor.set(actorId, { sidebarLayout });
    },
  };
  return port;
}

describe("actor preferences", () => {
  const actorId = asActorId("actor-1");
  const clock = { now: () => new Date("2026-11-06T10:00:00.000Z") };

  it("defaults to the navigation sidebar when the actor saved nothing", async () => {
    const get = new GetActorPreferencesUseCase(fakePreferences());

    await expect(get.execute({ actorId })).resolves.toEqual({ sidebarLayout: "navigation" });
  });

  it("returns the saved layout only for the actor who saved it", async () => {
    const port = fakePreferences();
    const get = new GetActorPreferencesUseCase(port);
    const save = new SaveActorPreferencesUseCase(port, clock);

    await expect(save.execute({ actorId, sidebarLayout: "pending-queue" })).resolves.toEqual({
      sidebarLayout: "pending-queue",
    });

    await expect(get.execute({ actorId })).resolves.toEqual({ sidebarLayout: "pending-queue" });
    await expect(get.execute({ actorId: asActorId("actor-2") })).resolves.toEqual({
      sidebarLayout: "navigation",
    });
  });
});
