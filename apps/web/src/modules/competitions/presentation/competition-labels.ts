import type {
  CompetitionFormatDto,
  CompetitionRegionDto,
  CompetitionScheduleDto,
  CompetitionStatusDto,
  GamePlatformDto,
} from "@futrob/api-contracts";
import { GAME_PLATFORM } from "@futrob/shared-kernel";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";

export type CompetitionMark = "league" | "cup";
export type CompetitionBadgeTone = "primary" | "info" | "neutral" | "warning" | "outline";

export function competitionStatusLabel(status: CompetitionStatusDto, t: Translator): string {
  return t(competitionStatusKey(status));
}

export function competitionFormatLabel(format: CompetitionFormatDto, t: Translator): string {
  return t(competitionFormatKey(format));
}

export function competitionRegionLabel(region: CompetitionRegionDto, t: Translator): string {
  return t(competitionRegionKey(region));
}

export function competitionPlatformLabel(platform: GamePlatformDto): string {
  return {
    [GAME_PLATFORM.PLAYSTATION]: "PlayStation",
    [GAME_PLATFORM.XBOX]: "Xbox",
    [GAME_PLATFORM.PC]: "PC",
    [GAME_PLATFORM.NINTENDO_SWITCH_1]: "Nintendo Switch 1",
    [GAME_PLATFORM.NINTENDO_SWITCH_2]: "Nintendo Switch 2",
  }[platform];
}

export function competitionMark(format: CompetitionFormatDto): CompetitionMark {
  switch (format) {
    case "league":
    case "league-playoffs":
      return "league";
    case "knockout":
    case "groups-knockout":
      return "cup";
    default: {
      const _exhaustive: never = format;
      return _exhaustive;
    }
  }
}

export function competitionListBadgeVariant(status: CompetitionStatusDto): CompetitionBadgeTone {
  switch (status) {
    case "registration":
      return "info";
    case "published":
      return "primary";
    case "finished":
      return "neutral";
    case "paused":
      return "warning";
    case "archived":
    case "draft":
      return "outline";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function competitionStatusKey(status: CompetitionStatusDto): ParameterlessMessageKey {
  switch (status) {
    case "registration":
      return "player.home.competitions.status.registration";
    case "published":
      return "player.home.competitions.status.published";
    case "draft":
      return "player.home.competitions.status.draft";
    case "paused":
      return "player.home.competitions.status.paused";
    case "finished":
      return "player.home.competitions.status.finished";
    case "archived":
      return "player.home.competitions.status.archived";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function competitionFormatKey(format: CompetitionFormatDto): ParameterlessMessageKey {
  switch (format) {
    case "league":
      return "player.home.competitions.format.league";
    case "knockout":
      return "player.home.competitions.format.knockout";
    case "groups-knockout":
      return "player.home.competitions.format.groups-knockout";
    case "league-playoffs":
      return "player.home.competitions.format.league-playoffs";
    default: {
      const _exhaustive: never = format;
      return _exhaustive;
    }
  }
}

function competitionRegionKey(region: CompetitionRegionDto): ParameterlessMessageKey {
  switch (region) {
    case "america":
      return "onboarding.region.america";
    case "south-america":
      return "onboarding.region.southAmerica";
    case "north-central-america":
      return "onboarding.region.northCentralAmerica";
    case "europe":
      return "onboarding.region.europe";
    case "africa":
      return "onboarding.region.africa";
    case "asia":
      return "onboarding.region.asia";
    case "middle-east":
      return "onboarding.region.middleEast";
    case "oceania":
      return "onboarding.region.oceania";
    default: {
      const _exhaustive: never = region;
      return _exhaustive;
    }
  }
}

const calendarFormat = (locale: "es" | "en") =>
  new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

const calendarInstant = (date: string) => new Date(`${date}T00:00:00Z`);

/**
 * `YYYY-MM-DD` dates → «12 oct – 20 dic 2026», «Inicio: 12 oct 2026» or «Fin: 20 dic 2026».
 * Formats in UTC so a calendar day never shifts across time zones.
 */
export function competitionScheduleLabel(
  schedule: CompetitionScheduleDto,
  locale: "es" | "en",
  t: Translator,
): string | null {
  const format = calendarFormat(locale);
  const { startsOn, endsOn } = schedule;
  if (startsOn && endsOn) {
    return format.formatRange(calendarInstant(startsOn), calendarInstant(endsOn));
  }
  if (startsOn) {
    return t("player.competitions.explore.card.startsOn", {
      date: format.format(calendarInstant(startsOn)),
    });
  }
  if (endsOn) {
    return t("player.competitions.explore.card.endsOn", {
      date: format.format(calendarInstant(endsOn)),
    });
  }
  return null;
}

/** «8 equipos», «8 de 12 equipos» or, at capacity, «Cupo completo (12 equipos)». */
export function competitionTeamsLabel(
  approvedCount: number,
  maxTeams: number | null | undefined,
  t: Translator,
): string {
  if (!maxTeams) return t("player.competitions.explore.card.teams", { count: approvedCount });
  if (approvedCount >= maxTeams) {
    return t("player.competitions.explore.card.teamsFull", { count: approvedCount });
  }
  return t("player.competitions.explore.card.teamsOf", { count: approvedCount, max: maxTeams });
}
