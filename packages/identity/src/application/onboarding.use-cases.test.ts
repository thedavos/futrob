import { describe, expect, it } from "vite-plus/test";
import { asActorId } from "@futrob/shared-kernel";
import { CompleteOnboardingUseCase } from "./complete-onboarding/complete-onboarding.use-case.ts";
import { GetOnboardingStatusUseCase } from "./get-onboarding-status/get-onboarding-status.use-case.ts";
import type { ActorOnboardingPort } from "../domain/ports/actor-onboarding.port.ts";
import type { CompletedOnboarding } from "../domain/value-objects/onboarding-status.ts";

class InMemoryActorOnboarding implements ActorOnboardingPort {
  readonly rows = new Map<string, CompletedOnboarding>();

  async findCompletedByActor(actorId: CompletedOnboarding["actorId"]) {
    return this.rows.get(actorId) ?? null;
  }

  async saveCompleted(onboarding: CompletedOnboarding) {
    this.rows.set(onboarding.actorId, onboarding);
  }
}

describe("identity onboarding", () => {
  it("reports incomplete when the actor has no profile", async () => {
    const status = await new GetOnboardingStatusUseCase(new InMemoryActorOnboarding()).execute({
      actorId: asActorId("actor-new"),
    });

    expect(status).toEqual({
      completed: false,
      completedAt: null,
      version: null,
      path: null,
    });
  });

  it("completes once and preserves the original completion metadata", async () => {
    const actorOnboarding = new InMemoryActorOnboarding();
    const actorId = asActorId("actor-player");
    let now = new Date("2026-07-29T10:00:00.000Z");
    const useCase = new CompleteOnboardingUseCase(actorOnboarding, { now: () => now });

    const first = await useCase.execute({ actorId, path: "player" });
    now = new Date("2026-07-30T10:00:00.000Z");
    const second = await useCase.execute({ actorId, path: "organization" });

    expect(first).toEqual({
      completed: true,
      completedAt: new Date("2026-07-29T10:00:00.000Z"),
      version: 1,
      path: "player",
    });
    expect(second).toEqual(first);
  });
});
