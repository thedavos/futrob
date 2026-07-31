import type { OnboardingPathDto, OnboardingStepDto } from "@futrob/api-contracts";

export type OnboardingRoute =
  | "/onboarding/intention"
  | "/onboarding/game"
  | "/onboarding/invitation"
  | "/onboarding/game-account"
  | "/onboarding/review";

const routeByStep: Record<OnboardingStepDto, OnboardingRoute> = {
  intention: "/onboarding/intention",
  game: "/onboarding/game",
  invitation: "/onboarding/invitation",
  "game-account": "/onboarding/game-account",
  review: "/onboarding/review",
};

const allowedStepsByPath: Record<OnboardingPathDto, readonly OnboardingStepDto[]> = {
  organization: ["intention", "game", "review"],
  invitation: ["intention", "invitation", "review"],
  player: ["intention", "game", "game-account", "review"],
};

export function resolveOnboardingStep(
  path: OnboardingPathDto | null,
  currentStep: OnboardingStepDto | null,
): OnboardingStepDto {
  if (!currentStep) return "intention";
  if (path === null) return currentStep === "intention" ? currentStep : "intention";
  return allowedStepsByPath[path].includes(currentStep) ? currentStep : "intention";
}

export function routeForOnboardingStep(step: OnboardingStepDto): OnboardingRoute {
  return routeByStep[step];
}
