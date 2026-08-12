import type { StepperStep } from "@futrob/ui";
import type { GamePlatformDto, OnboardingPathDto } from "@futrob/api-contracts";
import { EA_SEARCH_PLATFORM_OPTIONS } from "@futrob/api-contracts";
import { ONBOARDING_PATH } from "@futrob/identity";
import { GAME_PLATFORM } from "@futrob/shared-kernel";
import {
  competitionFormats,
  competitionRegions,
  competitionTimeZones,
} from "@/modules/competitions/presentation/competition-draft-meta.ts";
import { knownGameEditions } from "@/shared/presentation/forms/known-game-editions.ts";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";

export function intentionSteps(t: Translator): readonly StepperStep[] {
  return [
    { id: "intention", label: t("onboarding.step.start") },
    { id: "configure", label: t("onboarding.step.configure") },
    { id: "review", label: t("onboarding.step.review") },
  ];
}

export function stepsForPath(t: Translator, path: OnboardingPathDto): readonly StepperStep[] {
  const common = {
    intention: { id: "intention", label: t("onboarding.step.start") },
    account: { id: "game-account", label: t("onboarding.step.account") },
    review: { id: "review", label: t("onboarding.step.review") },
  } satisfies Record<string, StepperStep>;
  return {
    [ONBOARDING_PATH.organization]: [
      common.intention,
      { id: "organization", label: t("onboarding.step.organization") },
      { id: "competition", label: t("onboarding.step.competition") },
      common.account,
      common.review,
    ],
    [ONBOARDING_PATH.invitation]: [
      common.intention,
      { id: "invitation", label: t("onboarding.step.invitation") },
      common.account,
      common.review,
    ],
    [ONBOARDING_PATH.player]: [
      common.intention,
      common.account,
      { id: "club", label: t("onboarding.step.club") },
      common.review,
    ],
  }[path];
}

export const eaSearchPlatforms = EA_SEARCH_PLATFORM_OPTIONS;

/** Hard cap on clubs shown after an EA Clubs search in onboarding. */
export const MAX_EXTERNAL_CLUB_SEARCH_RESULTS = 3;

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

export function eaPlatformLabel(platform: string): string {
  return eaSearchPlatforms.find((option) => option.value === platform)?.label ?? platform;
}

/** Formats provider keys like `fc26` for display as `FC 26`. */
export function formatProviderGameEdition(edition: string): string {
  const trimmed = edition.trim();
  const match = trimmed.toLowerCase().match(/^fc[_\s-]?(\d{2})$/);
  if (match) return `FC ${match[1]}`;
  return trimmed;
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
