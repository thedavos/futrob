import type { ActorId } from "@futrob/shared-kernel";
import type { CompletedOnboarding } from "../value-objects/onboarding-status.ts";

export interface ActorOnboardingPort {
  findCompletedByActor(actorId: ActorId): Promise<CompletedOnboarding | null>;
  saveCompleted(onboarding: CompletedOnboarding): Promise<void>;
}
