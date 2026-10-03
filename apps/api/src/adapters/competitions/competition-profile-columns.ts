import {
  COMPETITION_COVER_PRESETS,
  DEFAULT_COMPETITION_COVER,
  parseCalendarDate,
  parseCompetitionCover,
  type CalendarDate,
  type CompetitionCover,
} from "@futrob/competitions";
import { asOrganizationId } from "@futrob/shared-kernel";
import { z } from "zod";

/** node-postgres parses DATE as local midnight; keep the calendar day, not an instant. */
export function calendarDate(value: Date | string | null | undefined): CalendarDate | null {
  if (value == null) return null;
  if (!(value instanceof Date)) return parseCalendarDate(value.slice(0, 10));
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return parseCalendarDate(`${value.getFullYear()}-${month}-${day}`);
}

const coverPresetSchema = z.enum(COMPETITION_COVER_PRESETS);

export function rehydrateCover(
  organizationId: string,
  kind: string | undefined,
  value: string | undefined,
): CompetitionCover {
  if (kind === "upload" && value) {
    return (
      parseCompetitionCover({ kind: "upload", key: value }, asOrganizationId(organizationId)) ??
      DEFAULT_COMPETITION_COVER
    );
  }
  const preset = coverPresetSchema.safeParse(value);
  return preset.success ? { kind: "preset", preset: preset.data } : DEFAULT_COMPETITION_COVER;
}

export function coverColumns(cover: CompetitionCover): [string, string] {
  return cover.kind === "upload" ? ["upload", cover.key] : ["preset", cover.preset];
}
