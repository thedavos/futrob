import { describe, expect, it } from "vite-plus/test";
import { asActorId } from "@futrob/shared-kernel";
import { CompleteOnboardingUseCase } from "./complete-onboarding/complete-onboarding.use-case.ts";
import { GetOnboardingStatusUseCase } from "./get-onboarding-status/get-onboarding-status.use-case.ts";
import { SaveOnboardingProgressUseCase } from "./save-onboarding-progress/save-onboarding-progress.use-case.ts";
import type { ActorOnboardingPort } from "../domain/ports/actor-onboarding.port.ts";
import type {
  ActorOnboardingState,
  CompletedOnboarding,
  OnboardingProgress,
} from "../domain/value-objects/onboarding-status.ts";

class InMemoryActorOnboarding implements ActorOnboardingPort {
  readonly rows = new Map<string, ActorOnboardingState>();

  async findByActor(actorId: CompletedOnboarding["actorId"]) {
    return this.rows.get(actorId) ?? null;
  }

  async saveProgress(progress: OnboardingProgress) {
    this.rows.set(progress.actorId, {
      actorId: progress.actorId,
      completed: false,
      completedAt: null,
      version: null,
      path: progress.path,
      currentStep: progress.currentStep,
    });
  }

  async saveCompleted(onboarding: CompletedOnboarding) {
    this.rows.set(onboarding.actorId, {
      ...onboarding,
      completed: true,
      currentStep: null,
    });
  }
}

describe("identity onboarding", () => {
  it("reports intention when the actor has no saved progress", async () => {
    const status = await new GetOnboardingStatusUseCase(new InMemoryActorOnboarding()).execute({
      actorId: asActorId("actor-new"),
    });

    expect(status).toEqual({
      completed: false,
      completedAt: null,
      version: null,
      path: null,
      currentStep: "intention",
    });
  });

  it("saves and resumes the current step without form data", async () => {
    const store = new InMemoryActorOnboarding();
    const actorId = asActorId("actor-player");
    const now = new Date("2026-07-29T10:00:00.000Z");
    await new SaveOnboardingProgressUseCase(store, { now: () => now }).execute({
      actorId,
      path: "player",
      currentStep: "game-account",
    });

    await expect(new GetOnboardingStatusUseCase(store).execute({ actorId })).resolves.toEqual({
      completed: false,
      completedAt: null,
      version: null,
      path: "player",
      currentStep: "game-account",
    });
  });

  it.each([
    ["organization", "intention"],
    ["organization", "organization"],
    ["organization", "competition"],
    ["organization", "game"],
    ["organization", "game-account"],
    ["organization", "review"],
    ["invitation", "intention"],
    ["invitation", "invitation"],
    ["invitation", "game-account"],
    ["invitation", "review"],
    ["player", "intention"],
    ["player", "game"],
    ["player", "game-account"],
    ["player", "review"],
    [null, "intention"],
  ] as const)("accepts progress %s → %s", async (path, currentStep) => {
    const store = new InMemoryActorOnboarding();
    const status = await new SaveOnboardingProgressUseCase(store, {
      now: () => new Date(),
    }).execute({
      actorId: asActorId("actor-valid"),
      path,
      currentStep,
    });

    expect(status).toMatchObject({ path, currentStep });
  });

  it.each([
    ["organization", "invitation"],
    ["invitation", "game"],
    ["invitation", "competition"],
    ["player", "invitation"],
    [null, "game"],
    [null, "invitation"],
    [null, "game-account"],
    [null, "review"],
  ] as const)("rejects progress %s → %s", async (path, currentStep) => {
    const store = new InMemoryActorOnboarding();
    await expect(
      new SaveOnboardingProgressUseCase(store, { now: () => new Date() }).execute({
        actorId: asActorId("actor-invalid"),
        path,
        currentStep,
      }),
    ).rejects.toThrow("identity.invalid_onboarding_progress");
  });

  it("completes once, clears progress and preserves original metadata", async () => {
    const actorOnboarding = new InMemoryActorOnboarding();
    const actorId = asActorId("actor-player");
    let now = new Date("2026-07-29T10:00:00.000Z");
    await new SaveOnboardingProgressUseCase(actorOnboarding, { now: () => now }).execute({
      actorId,
      path: "player",
      currentStep: "review",
    });
    const useCase = new CompleteOnboardingUseCase(actorOnboarding, { now: () => now });

    const first = await useCase.execute({ actorId, path: "player" });
    now = new Date("2026-07-30T10:00:00.000Z");
    const second = await useCase.execute({ actorId, path: "organization" });

    expect(first).toEqual({
      completed: true,
      completedAt: new Date("2026-07-29T10:00:00.000Z"),
      version: 2,
      path: "player",
      currentStep: null,
    });
    expect(second).toEqual(first);
  });
});
