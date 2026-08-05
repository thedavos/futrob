import type { StepperStep } from "@futrob/ui";
import type {
  CompetitionFormatDto,
  CompetitionRegionDto,
  GamePlatformDto,
  OnboardingPathDto,
} from "@futrob/api-contracts";
import { EA_SEARCH_PLATFORM_OPTIONS } from "@futrob/api-contracts";
import { ONBOARDING_PATH } from "@futrob/identity";
import { GAME_PLATFORM } from "@futrob/shared-kernel";

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

export const knownGameEditions = ["FC 25", "FC 26"] as const;

export const competitionRegions: readonly { value: CompetitionRegionDto; label: string }[] = [
  { value: "america", label: "América" },
  { value: "south-america", label: "Sudamérica" },
  { value: "north-central-america", label: "Norte y Centroamérica" },
  { value: "europe", label: "Europa" },
  { value: "africa", label: "África" },
  { value: "asia", label: "Asia" },
  { value: "middle-east", label: "Medio Oriente" },
  { value: "oceania", label: "Oceanía" },
];

export const competitionFormats: readonly { value: CompetitionFormatDto; label: string }[] = [
  { value: "league", label: "Liga" },
  { value: "knockout", label: "Eliminación directa" },
  { value: "groups-knockout", label: "Grupos + eliminación" },
  { value: "league-playoffs", label: "Liga + playoffs" },
];

const fallbackCompetitionTimeZones = [
  "America/Lima",
  "America/Bogota",
  "America/Mexico_City",
  "America/New_York",
  "America/Santiago",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Madrid",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Tokyo",
  "Australia/Sydney",
] as const;

export const competitionTimeZones = getCompetitionTimeZones();

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

export function formatLabel(format: CompetitionFormatDto): string {
  return competitionFormats.find((option) => option.value === format)?.label ?? format;
}

function getCompetitionTimeZones(): readonly { value: string; label: string }[] {
  let values: readonly string[] = fallbackCompetitionTimeZones;
  let localTimeZone = "UTC";
  try {
    localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    if (typeof Intl.supportedValuesOf === "function") {
      values = Intl.supportedValuesOf("timeZone");
    }
  } catch {
    values = fallbackCompetitionTimeZones;
  }
  return [...new Set(["UTC", localTimeZone, ...values])].map((value) => ({
    value,
    label: value.replaceAll("_", " "),
  }));
}
