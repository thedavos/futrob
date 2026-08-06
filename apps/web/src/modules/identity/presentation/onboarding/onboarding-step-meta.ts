import type { StepperStep } from "@futrob/ui";
import type { GamePlatformDto, OnboardingPathDto } from "@futrob/api-contracts";
import { EA_SEARCH_PLATFORM_OPTIONS } from "@futrob/api-contracts";
import { ONBOARDING_PATH } from "@futrob/identity";
import { GAME_PLATFORM } from "@futrob/shared-kernel";
import {
  competitionFormatLabel,
  competitionFormats,
  competitionRegions,
  competitionTimeZones,
} from "@/modules/competitions/presentation/competition-draft-meta.ts";
import { knownGameEditions } from "@/shared/presentation/forms/known-game-editions.ts";

export const intentionSteps: readonly StepperStep[] = [
  { id: "intention", label: "Inicio" },
  { id: "configure", label: "Configurar" },
  { id: "review", label: "Confirmar" },
];

export const stepsByPath: Record<OnboardingPathDto, readonly StepperStep[]> = {
  [ONBOARDING_PATH.organization]: [
    { id: "intention", label: "Inicio" },
    { id: "organization", label: "Organización" },
    { id: "competition", label: "Competición" },
    { id: "game-account", label: "Cuenta" },
    { id: "review", label: "Confirmar" },
  ],
  [ONBOARDING_PATH.invitation]: [
    { id: "intention", label: "Inicio" },
    { id: "invitation", label: "Invitación" },
    { id: "game-account", label: "Cuenta" },
    { id: "review", label: "Confirmar" },
  ],
  [ONBOARDING_PATH.player]: [
    { id: "intention", label: "Inicio" },
    { id: "game-account", label: "Cuenta" },
    { id: "team", label: "Club" },
    { id: "review", label: "Confirmar" },
  ],
};

export const eaSearchPlatforms = EA_SEARCH_PLATFORM_OPTIONS;

/** Hard cap on clubs shown after an EA Clubs search in onboarding. */
export const MAX_EXTERNAL_CLUB_SEARCH_RESULTS = 3;

export { knownGameEditions, competitionFormats, competitionRegions, competitionTimeZones };

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

export function formatLabel(format: Parameters<typeof competitionFormatLabel>[0]): string {
  return competitionFormatLabel(format);
}
