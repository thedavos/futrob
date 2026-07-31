import type {
  ActorOnboardingPort,
  ActorOnboardingState,
  CompletedOnboarding,
  OnboardingProgress,
} from "@futrob/identity";
import type { ActorId } from "@futrob/shared-kernel";

export class InMemoryActorOnboardingRepository implements ActorOnboardingPort {
  private readonly byActor = new Map<string, ActorOnboardingState>();

  async findByActor(actorId: ActorId): Promise<ActorOnboardingState | null> {
    return this.byActor.get(actorId) ?? null;
  }

  async saveProgress(progress: OnboardingProgress): Promise<void> {
    const existing = this.byActor.get(progress.actorId);
    if (existing?.completed) return;
    this.byActor.set(progress.actorId, {
      actorId: progress.actorId,
      completed: false,
      completedAt: null,
      version: null,
      path: progress.path,
      currentStep: progress.currentStep,
    });
  }

  async saveCompleted(onboarding: CompletedOnboarding): Promise<void> {
    if (!this.byActor.get(onboarding.actorId)?.completed) {
      this.byActor.set(onboarding.actorId, {
        ...onboarding,
        completed: true,
        currentStep: null,
      });
    }
  }
}
