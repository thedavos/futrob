import type { ActorOnboardingPort, CompletedOnboarding } from "@futrob/identity";
import type { ActorId } from "@futrob/shared-kernel";

export class InMemoryActorOnboardingRepository implements ActorOnboardingPort {
  private readonly completedByActor = new Map<string, CompletedOnboarding>();

  async findCompletedByActor(actorId: ActorId): Promise<CompletedOnboarding | null> {
    return this.completedByActor.get(actorId) ?? null;
  }

  async saveCompleted(onboarding: CompletedOnboarding): Promise<void> {
    if (!this.completedByActor.has(onboarding.actorId)) {
      this.completedByActor.set(onboarding.actorId, onboarding);
    }
  }
}
