import type { ActorId } from "@futrob/shared-kernel";

export const CURRENT_ONBOARDING_VERSION = 4;

export const ONBOARDING_PATH = {
  player: "player",
  organization: "organization",
  invitation: "invitation",
} as const;

export type OnboardingPath = (typeof ONBOARDING_PATH)[keyof typeof ONBOARDING_PATH];

export const ONBOARDING_STEPS = [
  "intention",
  "organization",
  "invitation",
  "game-account",
  "club",
  "review",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const ONBOARDING_STEPS_BY_PATH = {
  [ONBOARDING_PATH.organization]: ["intention", "organization", "review"],
  [ONBOARDING_PATH.invitation]: ["intention", "invitation", "game-account", "review"],
  [ONBOARDING_PATH.player]: ["intention", "game-account", "club", "review"],
} as const satisfies Record<OnboardingPath, readonly OnboardingStep[]>;

export function isOnboardingStepAllowed(
  path: OnboardingPath | null,
  step: OnboardingStep,
): boolean {
  if (path === null) {
    return step === "intention";
  }
  return (
    (path === "organization" && step === "game-account") ||
    ONBOARDING_STEPS_BY_PATH[path].some((allowed) => allowed === step)
  );
}

export interface OnboardingStatus {
  readonly completed: boolean;
  readonly completedAt: Date | null;
  readonly version: number | null;
  readonly path: OnboardingPath | null;
  readonly currentStep: OnboardingStep | null;
}

export interface ActorOnboardingState extends OnboardingStatus {
  readonly actorId: ActorId;
}

export interface OnboardingProgress {
  readonly actorId: ActorId;
  readonly path: OnboardingPath | null;
  readonly currentStep: OnboardingStep;
  /** Flow version the actor is walking, so funnel history can be split by flow revision. */
  readonly version: number;
  readonly updatedAt: Date;
}

export interface CompletedOnboarding {
  readonly actorId: ActorId;
  readonly completedAt: Date;
  readonly version: number;
  readonly path: OnboardingPath;
}
