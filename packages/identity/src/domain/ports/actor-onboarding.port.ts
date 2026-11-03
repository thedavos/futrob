import type { ActorId } from "@futrob/shared-kernel";
import type {
  ActorOnboardingState,
  CompletedOnboarding,
  OnboardingProgress,
} from "../value-objects/onboarding-status.ts";

/**
 * Current onboarding state plus its append-only funnel history (ADR-0026).
 * Each write appends one history entry only when it changes the stored state, so a
 * repeated or retried write leaves both the state and the history unchanged.
 */
export interface ActorOnboardingPort {
  findByActor(actorId: ActorId): Promise<ActorOnboardingState | null>;
  /** Serializes onboarding completion for one actor until the current transaction ends. */
  lockActor(actorId: ActorId): Promise<void>;
  /**
   * Stores the step and records `step-entered` when path or step differ from the stored ones.
   * A write without a path never replaces a chosen one, checked in the same write so a stale
   * entry racing a newer step cannot rewind it.
   */
  saveProgress(progress: OnboardingProgress): Promise<void>;
  /** Marks completion and records `completed` once, on the transition. */
  saveCompleted(onboarding: CompletedOnboarding): Promise<void>;
}
