import type { StepperStep } from "@futrob/ui";
import {
  ONBOARDING_STEPS_BY_PATH,
  type GamePlatformDto,
  type OnboardingPathDto,
  type OnboardingStepDto,
} from "@futrob/api-contracts";
import { GAME_PLATFORM } from "@futrob/shared-kernel";
import {
  competitionFormats,
  competitionRegions,
  competitionTimeZones,
} from "@/modules/competitions/presentation/competition-draft-meta.ts";
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

export function stepsForPath(t: Translator, path: OnboardingPathDto): readonly StepperStep[] {
  const labels = {
    intention: t("onboarding.step.start"),
    organization: t("onboarding.step.organization"),
    competition: t("onboarding.step.competition"),
    invitation: t("onboarding.step.invitation"),
    "game-account": t("onboarding.step.account"),
    club: t("onboarding.step.club"),
    review: t("onboarding.step.review"),
  } satisfies Record<OnboardingStepDto, string>;
  return ONBOARDING_STEPS_BY_PATH[path].map((id) => ({ id, label: labels[id] }));
}

export { knownGameEditions, competitionFormats, competitionRegions, competitionTimeZones };

export function localizedCompetitionRegions(t: Translator): typeof competitionRegions {
  const labels = {
    america: t("onboarding.region.america"),
    "south-america": t("onboarding.region.southAmerica"),
    "north-central-america": t("onboarding.region.northCentralAmerica"),
    europe: t("onboarding.region.europe"),
    africa: t("onboarding.region.africa"),
    asia: t("onboarding.region.asia"),
    "middle-east": t("onboarding.region.middleEast"),
    oceania: t("onboarding.region.oceania"),
  } satisfies Record<(typeof competitionRegions)[number]["value"], string>;
  return competitionRegions.map((option) => ({ ...option, label: labels[option.value] }));
}

export function localizedCompetitionFormats(t: Translator): typeof competitionFormats {
  return competitionFormats.map((option) => ({
    ...option,
    label: formatLabel(option.value, t),
  }));
}

export function platformLabel(platform: GamePlatformDto): string {
  return {
    [GAME_PLATFORM.PLAYSTATION]: "PlayStation",
    [GAME_PLATFORM.XBOX]: "Xbox",
    [GAME_PLATFORM.PC]: "PC",
    [GAME_PLATFORM.NINTENDO_SWITCH_1]: "Nintendo Switch 1",
    [GAME_PLATFORM.NINTENDO_SWITCH_2]: "Nintendo Switch 2",
  }[platform];
}

export function formatLabel(
  format: (typeof competitionFormats)[number]["value"],
  t: Translator,
): string {
  return {
    league: t("onboarding.format.league"),
    knockout: t("onboarding.format.knockout"),
    "groups-knockout": t("onboarding.format.groupsKnockout"),
    "league-playoffs": t("onboarding.format.leaguePlayoffs"),
  }[format];
}
