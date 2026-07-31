import type { ActorId } from "@futrob/shared-kernel";
import type {
  ActorOnboardingState,
  CompletedOnboarding,
  OnboardingProgress,
} from "../value-objects/onboarding-status.ts";

export interface ActorOnboardingPort {
  findByActor(actorId: ActorId): Promise<ActorOnboardingState | null>;
  saveProgress(progress: OnboardingProgress): Promise<void>;
  saveCompleted(onboarding: CompletedOnboarding): Promise<void>;
}
