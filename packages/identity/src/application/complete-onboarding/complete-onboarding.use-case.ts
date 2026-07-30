import type { ActorId, ClockPort } from "@futrob/shared-kernel";
import type { ActorOnboardingPort } from "../../domain/ports/actor-onboarding.port.ts";
import {
  CURRENT_ONBOARDING_VERSION,
  type OnboardingPath,
  type OnboardingStatus,
} from "../../domain/value-objects/onboarding-status.ts";

export interface CompleteOnboardingInput {
  readonly actorId: ActorId;
  readonly path: OnboardingPath;
  readonly version?: number;
}

export class CompleteOnboardingUseCase {
  constructor(
    private readonly actorOnboarding: ActorOnboardingPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(input: CompleteOnboardingInput): Promise<OnboardingStatus> {
    const existing = await this.actorOnboarding.findCompletedByActor(input.actorId);
    if (existing) {
      return {
        completed: true,
        completedAt: existing.completedAt,
        version: existing.version,
        path: existing.path,
      };
    }

    const completed = {
      actorId: input.actorId,
      completedAt: this.clock.now(),
      version: input.version ?? CURRENT_ONBOARDING_VERSION,
      path: input.path,
    };
    await this.actorOnboarding.saveCompleted(completed);

    return {
      completed: true,
      completedAt: completed.completedAt,
      version: completed.version,
      path: completed.path,
    };
  }
}
