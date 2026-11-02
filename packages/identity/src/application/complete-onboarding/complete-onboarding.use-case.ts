import { err, ok, type ActorId, type ClockPort, type Result } from "@futrob/shared-kernel";
import { OnboardingPathConflict } from "../../domain/errors/onboarding.errors.ts";
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

  /**
   * Run first inside the completion transaction: locks the actor's onboarding so concurrent
   * completions serialize, then rejects a path other than the one already completed.
   * Completing the same path again is allowed, so a retried request converges.
   */
  async prepare(input: {
    readonly actorId: ActorId;
    readonly path: OnboardingPath;
  }): Promise<Result<void, OnboardingPathConflict>> {
    await this.actorOnboarding.lockActor(input.actorId);
    const existing = await this.actorOnboarding.findByActor(input.actorId);
    if (existing?.completed && existing.path !== null && existing.path !== input.path) {
      return err(
        new OnboardingPathConflict({
          code: "identity.onboarding_path_conflict",
          message: "identity.onboarding_path_conflict",
          completedPath: existing.path,
          requestedPath: input.path,
        }),
      );
    }
    return ok(undefined);
  }

  async execute(input: CompleteOnboardingInput): Promise<OnboardingStatus> {
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
      currentStep: null,
    };
  }
}
