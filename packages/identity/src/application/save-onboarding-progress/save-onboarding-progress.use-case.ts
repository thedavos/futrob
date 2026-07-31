import type { ActorId, ClockPort } from "@futrob/shared-kernel";
import type { ActorOnboardingPort } from "../../domain/ports/actor-onboarding.port.ts";
import {
  isOnboardingStepAllowed,
  type OnboardingPath,
  type OnboardingStatus,
  type OnboardingStep,
} from "../../domain/value-objects/onboarding-status.ts";

export interface SaveOnboardingProgressInput {
  readonly actorId: ActorId;
  readonly path: OnboardingPath | null;
  readonly currentStep: OnboardingStep;
}

export class SaveOnboardingProgressUseCase {
  constructor(
    private readonly actorOnboarding: ActorOnboardingPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(input: SaveOnboardingProgressInput): Promise<OnboardingStatus> {
    if (!isOnboardingStepAllowed(input.path, input.currentStep)) {
      throw new RangeError("identity.invalid_onboarding_progress");
    }

    const existing = await this.actorOnboarding.findByActor(input.actorId);
    if (existing?.completed) {
      return {
        completed: true,
        completedAt: existing.completedAt,
        version: existing.version,
        path: existing.path,
        currentStep: null,
      };
    }

    await this.actorOnboarding.saveProgress({
      actorId: input.actorId,
      path: input.path,
      currentStep: input.currentStep,
      updatedAt: this.clock.now(),
    });

    return {
      completed: false,
      completedAt: null,
      version: null,
      path: input.path,
      currentStep: input.currentStep,
    };
  }
}
