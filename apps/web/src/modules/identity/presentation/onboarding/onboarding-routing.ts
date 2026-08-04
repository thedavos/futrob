import type { OnboardingPathDto, OnboardingStepDto } from "@futrob/api-contracts";

export type OnboardingRoute =
  | "/onboarding/intention"
  | "/onboarding/organization"
  | "/onboarding/competition"
  | "/onboarding/invitation"
  | "/onboarding/game-account"
  | "/onboarding/team"
  | "/onboarding/review";

const routeByStep: Record<OnboardingStepDto, OnboardingRoute> = {
  intention: "/onboarding/intention",
  organization: "/onboarding/organization",
  competition: "/onboarding/competition",
  game: "/onboarding/game-account",
  invitation: "/onboarding/invitation",
  "game-account": "/onboarding/game-account",
  team: "/onboarding/team",
  review: "/onboarding/review",
};

const allowedStepsByPath: Record<OnboardingPathDto, readonly OnboardingStepDto[]> = {
  organization: ["intention", "organization", "competition", "game-account", "review"],
  invitation: ["intention", "invitation", "game-account", "review"],
  player: ["intention", "game-account", "team", "review"],
};

/**
 * Cold bootstrap without a rehydratable draft always opens at intention.
 * Server path remains in provider state for analytics / preselect.
 */
export function resolveOnboardingStep(
  _path: OnboardingPathDto | null,
  _currentStep: OnboardingStepDto | null,
): OnboardingStepDto {
  return "intention";
}

/** Storybook / harness: honor a persisted step when explicitly requested. */
export function resolvePersistedOnboardingStep(
  path: OnboardingPathDto | null,
  currentStep: OnboardingStepDto | null,
): OnboardingStepDto {
  if (!currentStep) return "intention";
  if (path === null) return currentStep === "intention" ? currentStep : "intention";
  if (currentStep === "game") {
    return path === "organization"
      ? "organization"
      : path === "player"
        ? "game-account"
        : "intention";
  }
  return allowedStepsByPath[path].includes(currentStep) ? currentStep : "intention";
}

export function isOnboardingStepAllowedForPath(
  path: OnboardingPathDto | null,
  step: OnboardingStepDto,
): boolean {
  if (path === null) return step === "intention";
  if (step === "game") return path === "organization" || path === "player";
  return allowedStepsByPath[path].includes(step);
}

export function routeForOnboardingStep(step: OnboardingStepDto): OnboardingRoute {
  return routeByStep[step];
}
