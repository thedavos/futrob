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

export function resolveOnboardingStep(
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

export function routeForOnboardingStep(step: OnboardingStepDto): OnboardingRoute {
  return routeByStep[step];
}
