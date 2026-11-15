import type { StepperStep } from "@futrob/ui";
import {
  onboardingStepsForPath,
  type GamePlatformDto,
  type OnboardingPathDto,
  type OnboardingStepDto,
} from "@futrob/api-contracts";
import { GAME_PLATFORM } from "@futrob/shared-kernel";
import {
  eaPlatformLabel,
  eaSearchPlatforms,
  formatProviderGameEdition,
  MAX_EXTERNAL_CLUB_SEARCH_RESULTS,
} from "@/modules/game-data/presentation/ea-club-search-meta.ts";
import { knownGameEditions } from "@/shared/presentation/forms/known-game-editions.ts";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";

export {
  eaPlatformLabel,
  eaSearchPlatforms,
  formatProviderGameEdition,
  MAX_EXTERNAL_CLUB_SEARCH_RESULTS,
};

export function intentionSteps(t: Translator): readonly StepperStep[] {
  return [
    { id: "intention", label: t("onboarding.step.start") },
    { id: "configure", label: t("onboarding.step.configure") },
    { id: "review", label: t("onboarding.step.review") },
  ];
}

export function stepsForPath(
  t: Translator,
  path: OnboardingPathDto,
  includeAccount = false,
): readonly StepperStep[] {
  const labels = {
    intention: t("onboarding.step.start"),
    organization: t("onboarding.step.organization"),
    invitation: t("onboarding.step.invitation"),
    "game-account": t("onboarding.step.account"),
    club: t("onboarding.step.club"),
    review: t("onboarding.step.review"),
  } satisfies Record<OnboardingStepDto, string>;
  const steps = onboardingStepsForPath(path, includeAccount);
  return steps.map((id) => ({ id, label: labels[id] }));
}

export { knownGameEditions };

export function platformLabel(platform: GamePlatformDto): string {
  return {
    [GAME_PLATFORM.PLAYSTATION]: "PlayStation",
    [GAME_PLATFORM.XBOX]: "Xbox",
    [GAME_PLATFORM.PC]: "PC",
    [GAME_PLATFORM.NINTENDO_SWITCH_1]: "Nintendo Switch 1",
    [GAME_PLATFORM.NINTENDO_SWITCH_2]: "Nintendo Switch 2",
  }[platform];
}
