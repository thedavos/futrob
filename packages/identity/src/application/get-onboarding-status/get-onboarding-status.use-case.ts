import type { ActorId } from "@futrob/shared-kernel";
import type { ActorOnboardingPort } from "../../domain/ports/actor-onboarding.port.ts";
import type { OnboardingStatus } from "../../domain/value-objects/onboarding-status.ts";

export interface GetOnboardingStatusInput {
  readonly actorId: ActorId;
}

export class GetOnboardingStatusUseCase {
  constructor(private readonly actorOnboarding: ActorOnboardingPort) {}

  async execute(input: GetOnboardingStatusInput): Promise<OnboardingStatus> {
    const completed = await this.actorOnboarding.findCompletedByActor(input.actorId);

    if (!completed) {
      return {
        completed: false,
        completedAt: null,
        version: null,
        path: null,
      };
    }

    return {
      completed: true,
      completedAt: completed.completedAt,
      version: completed.version,
      path: completed.path,
    };
  }
}
