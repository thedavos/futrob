import type {
  ActorOnboardingPort,
  ActorOnboardingState,
  CompletedOnboarding,
  OnboardingPath,
  OnboardingProgress,
  OnboardingStep,
} from "@futrob/identity";
import type { ActorId } from "@futrob/shared-kernel";

export type InMemoryOnboardingEvent =
  | {
      readonly kind: "step-entered";
      readonly actorId: ActorId;
      readonly path: OnboardingPath | null;
      readonly step: OnboardingStep;
      readonly version: number;
      readonly occurredAt: Date;
    }
  | {
      readonly kind: "completed";
      readonly actorId: ActorId;
      readonly path: OnboardingPath;
      readonly version: number;
      readonly occurredAt: Date;
    };

export class InMemoryActorOnboardingRepository implements ActorOnboardingPort {
  private readonly byActor = new Map<string, ActorOnboardingState>();
  readonly events: InMemoryOnboardingEvent[] = [];

  async findByActor(actorId: ActorId): Promise<ActorOnboardingState | null> {
    return this.byActor.get(actorId) ?? null;
  }

  async saveProgress(progress: OnboardingProgress): Promise<void> {
    const existing = this.byActor.get(progress.actorId);
    if (existing?.completed) return;
    if (existing?.path === progress.path && existing.currentStep === progress.currentStep) return;
    this.byActor.set(progress.actorId, {
      actorId: progress.actorId,
      completed: false,
      completedAt: null,
      version: null,
      path: progress.path,
      currentStep: progress.currentStep,
    });
    this.events.push({
      kind: "step-entered",
      actorId: progress.actorId,
      path: progress.path,
      step: progress.currentStep,
      version: progress.version,
      occurredAt: progress.updatedAt,
    });
  }

  async saveCompleted(onboarding: CompletedOnboarding): Promise<void> {
    if (this.byActor.get(onboarding.actorId)?.completed) return;
    this.byActor.set(onboarding.actorId, {
      ...onboarding,
      completed: true,
      currentStep: null,
    });
    this.events.push({
      kind: "completed",
      actorId: onboarding.actorId,
      path: onboarding.path,
      version: onboarding.version,
      occurredAt: onboarding.completedAt,
    });
  }
}
