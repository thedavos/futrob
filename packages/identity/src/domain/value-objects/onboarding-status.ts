import type { ActorId } from "@futrob/shared-kernel";

export const CURRENT_ONBOARDING_VERSION = 3;

export const ONBOARDING_PATH = {
  player: "player",
  organization: "organization",
  invitation: "invitation",
} as const;

export type OnboardingPath = (typeof ONBOARDING_PATH)[keyof typeof ONBOARDING_PATH];

export type OnboardingStep =
  | "intention"
  | "organization"
  | "competition"
  | "game"
  | "invitation"
  | "game-account"
  | "team"
  | "review";

const stepsByPath: Record<OnboardingPath, readonly OnboardingStep[]> = {
  [ONBOARDING_PATH.organization]: [
    "intention",
    "organization",
    "competition",
    "game-account",
    "game",
    "review",
  ],
  [ONBOARDING_PATH.invitation]: ["intention", "invitation", "game-account", "review"],
  [ONBOARDING_PATH.player]: ["intention", "game", "game-account", "team", "review"],
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
