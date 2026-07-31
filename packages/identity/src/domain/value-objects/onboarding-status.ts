import type { ActorId } from "@futrob/shared-kernel";

export const CURRENT_ONBOARDING_VERSION = 2;

export type OnboardingPath = "player" | "organization" | "invitation";
export type OnboardingStep =
  | "intention"
  | "organization"
  | "competition"
  | "game"
  | "invitation"
  | "game-account"
  | "review";

const stepsByPath: Record<OnboardingPath, readonly OnboardingStep[]> = {
  organization: ["intention", "organization", "competition", "game-account", "game", "review"],
  invitation: ["intention", "invitation", "game-account", "review"],
  player: ["intention", "game", "game-account", "review"],
};

export function isOnboardingStepAllowed(
  path: OnboardingPath | null,
  step: OnboardingStep,
): boolean {
  return path === null ? step === "intention" : stepsByPath[path].includes(step);
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
  readonly updatedAt: Date;
}

export interface CompletedOnboarding {
  readonly actorId: ActorId;
  readonly completedAt: Date;
  readonly version: number;
  readonly path: OnboardingPath;
}
