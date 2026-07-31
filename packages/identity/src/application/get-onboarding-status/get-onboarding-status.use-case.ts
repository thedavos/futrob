import type { ActorId } from "@futrob/shared-kernel";
import type { ActorOnboardingPort } from "../../domain/ports/actor-onboarding.port.ts";
import type { OnboardingStatus } from "../../domain/value-objects/onboarding-status.ts";

export interface GetOnboardingStatusInput {
  readonly actorId: ActorId;
}

export class GetOnboardingStatusUseCase {
  constructor(private readonly actorOnboarding: ActorOnboardingPort) {}

  async execute(input: GetOnboardingStatusInput): Promise<OnboardingStatus> {
    const state = await this.actorOnboarding.findByActor(input.actorId);

    if (!state) {
      return {
        completed: false,
        completedAt: null,
        version: null,
        path: null,
        currentStep: "intention",
      };
    }

    return {
      completed: state.completed,
      completedAt: state.completedAt,
      version: state.version,
      path: state.path,
      currentStep: state.currentStep,
    };
  }
}
