import type {
  CompetitionFormatDto,
  CompetitionRegionDto,
  GamePlatformDto,
} from "@futrob/api-contracts";
import { GAME_PLATFORM } from "@futrob/shared-kernel";

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

export function competitionPlatformLabel(platform: GamePlatformDto): string {
  return {
    [GAME_PLATFORM.PLAYSTATION]: "PlayStation",
    [GAME_PLATFORM.XBOX]: "Xbox",
    [GAME_PLATFORM.PC]: "PC",
    [GAME_PLATFORM.NINTENDO_SWITCH_1]: "Nintendo Switch 1",
    [GAME_PLATFORM.NINTENDO_SWITCH_2]: "Nintendo Switch 2",
  }[platform];
}

export function competitionRegionLabel(region: CompetitionRegionDto): string {
  return competitionRegions.find((option) => option.value === region)?.label ?? region;
}

export function competitionFormatLabel(format: CompetitionFormatDto): string {
  return competitionFormats.find((option) => option.value === format)?.label ?? format;
}

function getCompetitionTimeZones(): readonly { value: string; label: string }[] {
  let values: readonly string[] = fallbackCompetitionTimeZones;
  let localTimeZone = "UTC";
  try {
    localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    if ("supportedValuesOf" in Intl) {
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
