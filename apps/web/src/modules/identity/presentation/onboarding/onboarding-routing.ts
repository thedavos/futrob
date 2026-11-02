import type { OnboardingStepDto } from "@futrob/api-contracts";

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

export function routeForOnboardingStep(step: OnboardingStepDto): OnboardingRoute {
  return routeByStep[step];
}

export function isOnboardingPathname(pathname: string): boolean {
  return pathname === "/onboarding" || pathname.startsWith("/onboarding/");
}
