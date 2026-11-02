import {
  isOnboardingStepAllowed,
  type OnboardingPathDto,
  type OnboardingStepDto,
} from "@futrob/api-contracts";

const routeByStep = {
  intention: "/onboarding/intention",
  organization: "/onboarding/organization",
  competition: "/onboarding/competition",
  invitation: "/onboarding/invitation",
  "game-account": "/onboarding/game-account",
  club: "/onboarding/club",
  review: "/onboarding/review",
} as const satisfies Record<OnboardingStepDto, `/onboarding/${string}`>;

export type OnboardingRoute = (typeof routeByStep)[OnboardingStepDto];

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
  return currentStep && isOnboardingStepAllowed(path, currentStep) ? currentStep : "intention";
}

export function routeForOnboardingStep(step: OnboardingStepDto): OnboardingRoute {
  return routeByStep[step];
}

export function isOnboardingPathname(pathname: string): boolean {
  return pathname === "/onboarding" || pathname.startsWith("/onboarding/");
}
