import type {
  CompetitionCoverDto,
  CompetitionDto,
  CompetitionScheduleDto,
  CompetitionTeamRangeDto,
} from "@futrob/api-contracts";

export const MAX_COVER_UPLOAD_BYTES = 2 * 1024 * 1024;
const COVER_UPLOAD_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

/** A chosen preset, an already stored upload, or a local file that uploads on submit. */
export type CoverSelection = CompetitionCoverDto | { readonly kind: "file"; readonly file: File };

/** Raw form state: inputs keep strings so partial typing never coerces to a number. */
export interface CompetitionProfileFieldsValue {
  readonly minTeams: string;
  readonly maxTeams: string;
  readonly startsOn: string;
  readonly endsOn: string;
  readonly cover: CoverSelection;
}

export type CompetitionProfileField =
  | "min-teams"
  | "max-teams"
  | "start-date"
  | "end-date"
  | "cover";

export interface CompetitionProfileFieldError {
  readonly field: CompetitionProfileField;
  readonly message: string;
}

export const DEFAULT_PROFILE_FIELDS: CompetitionProfileFieldsValue = {
  minTeams: "2",
  maxTeams: "",
  startsOn: "",
  endsOn: "",
  cover: { kind: "preset", preset: "cup" },
};

export function profileFieldsFromCompetition(
  competition: Pick<CompetitionDto, "teams" | "schedule" | "cover">,
): CompetitionProfileFieldsValue {
  return {
    minTeams: String(competition.teams.min),
    maxTeams: competition.teams.max === null ? "" : String(competition.teams.max),
    startsOn: competition.schedule.startsOn ?? "",
    endsOn: competition.schedule.endsOn ?? "",
    cover: competition.cover,
  };
}

const teamCount = (value: string): number | null => {
  if (!/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value.trim());
  return parsed >= 2 && parsed <= 256 ? parsed : null;
};

export function validateCompetitionProfileFields(
  value: CompetitionProfileFieldsValue,
): CompetitionProfileFieldError | null {
  const min = teamCount(value.minTeams);
  if (min === null) {
    return { field: "min-teams", message: "Escribe un mínimo entre 2 y 256 equipos." };
  }
  if (value.maxTeams.trim()) {
    const max = teamCount(value.maxTeams);
    if (max === null) {
      return {
        field: "max-teams",
        message: "Escribe un máximo entre 2 y 256 equipos, o déjalo vacío.",
      };
    }
    if (max < min) {
      return { field: "max-teams", message: "El máximo debe ser igual o mayor que el mínimo." };
    }
  }
  if (value.startsOn && value.endsOn && value.endsOn < value.startsOn) {
    return {
      field: "end-date",
      message: "Elige una fecha de fin igual o posterior a la de inicio.",
    };
  }
  if (
    value.cover.kind === "file" &&
    (!COVER_UPLOAD_TYPES.has(value.cover.file.type) ||
      value.cover.file.size > MAX_COVER_UPLOAD_BYTES)
  ) {
    return { field: "cover", message: "Sube una imagen PNG, JPG o WebP de hasta 2 MB." };
  }
  return null;
}

export interface TeamsAndSchedule {
  readonly teams: CompetitionTeamRangeDto;
  readonly schedule: CompetitionScheduleDto;
}

/** Call only after `validateCompetitionProfileFields` returned null. */
export function toTeamsAndSchedule(value: CompetitionProfileFieldsValue): TeamsAndSchedule {
  return {
    teams: {
      min: Number(value.minTeams.trim()),
      max: value.maxTeams.trim() ? Number(value.maxTeams.trim()) : null,
    },
    schedule: { startsOn: value.startsOn || null, endsOn: value.endsOn || null },
  };
}
