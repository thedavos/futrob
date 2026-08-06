import type {
  CompetitionFormatDto,
  CompetitionRegionDto,
  GamePlatformDto,
} from "@futrob/api-contracts";

export type CompetitionDraftField =
  | "name"
  | "edition"
  | "platform"
  | "region"
  | "time-zone"
  | "format";

export type CompetitionDraftFieldError = {
  readonly field: CompetitionDraftField;
  readonly message: string;
};

export type CompetitionDraftFieldsValue = {
  readonly name: string;
  readonly gameEdition: string;
  readonly customEdition: boolean;
  readonly platform: GamePlatformDto | null;
  readonly region: CompetitionRegionDto | null;
  readonly timeZone: string;
  readonly format: CompetitionFormatDto | null;
};

export function isIanaTimeZone(value: string): boolean {
  if (!value.trim()) return false;
  try {
    new Intl.DateTimeFormat("es", { timeZone: value.trim() }).format();
    return true;
  } catch {
    return false;
  }
}

export function validateCompetitionDraftFields(
  value: CompetitionDraftFieldsValue,
): CompetitionDraftFieldError | null {
  const name = value.name.trim();
  const gameEdition = value.gameEdition.trim();
  const timeZone = value.timeZone.trim();

  if (!name || name.length > 120) {
    return {
      field: "name",
      message: name
        ? "El nombre debe tener como máximo 120 caracteres."
        : "Escribe el nombre de la competición.",
    };
  }
  if (!gameEdition || gameEdition.length > 40) {
    return {
      field: "edition",
      message: gameEdition
        ? "La edición debe tener como máximo 40 caracteres."
        : "Selecciona o escribe la edición del juego.",
    };
  }
  if (!value.platform) {
    return { field: "platform", message: "Selecciona la plataforma de la competición." };
  }
  if (!value.region) {
    return { field: "region", message: "Selecciona la región de la competición." };
  }
  if (!isIanaTimeZone(timeZone)) {
    return { field: "time-zone", message: "Selecciona una zona horaria válida." };
  }
  if (!value.format) {
    return { field: "format", message: "Selecciona el formato inicial de la competición." };
  }
  return null;
}
