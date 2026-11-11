import { z } from "zod";
import {
  competitionCoverPresetSchema,
  competitionFormatSchema,
  competitionPlatformSchema,
  competitionRegionSchema,
} from "../competitions/schemas.ts";

/**
 * Anonymous, cacheable reads of a published competition (ADR-0024).
 *
 * Every object is strict: an unexpected key fails the response parse in the API (a 500
 * instead of a leak) and fails `parse` in the SDK. These shapes are the allowlist, so
 * adding a field here is the only way for new data to reach a spectator.
 */
export const publicCompetitionKeySchema = z.string().min(1).max(128);

export const publicCompetitionStatusSchema = z.enum(["published", "paused", "finished"]);
export type PublicCompetitionStatusDto = z.infer<typeof publicCompetitionStatusSchema>;

const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const publicCompetitionSchema = z.strictObject({
  name: z.string(),
  status: publicCompetitionStatusSchema,
  format: competitionFormatSchema,
  platform: competitionPlatformSchema,
  gameEdition: z.string(),
  region: competitionRegionSchema,
  timeZone: z.string(),
  startsOn: calendarDateSchema.nullable(),
  endsOn: calendarDateSchema.nullable(),
  approvedTeamCount: z.number().int().nonnegative(),
  coverPreset: competitionCoverPresetSchema.nullable(),
});
export type PublicCompetitionDto = z.infer<typeof publicCompetitionSchema>;

export const getPublicCompetitionResponseSchema = z.strictObject({
  competition: publicCompetitionSchema,
});
export type GetPublicCompetitionResponse = z.infer<typeof getPublicCompetitionResponseSchema>;

export const publicStandingRowSchema = z.strictObject({
  position: z.number().int().positive(),
  teamName: z.string(),
  played: z.number().int().nonnegative(),
  wins: z.number().int().nonnegative(),
  draws: z.number().int().nonnegative(),
  losses: z.number().int().nonnegative(),
  goalsFor: z.number().int().nonnegative(),
  goalsAgainst: z.number().int().nonnegative(),
  goalDifference: z.number().int(),
  points: z.number().int(),
  /** Latest official results, oldest first. */
  form: z.array(z.enum(["win", "draw", "loss"])).max(5),
  /** Swiss only. `points` already include the rests. */
  buchholz: z.number().int().optional(),
  byes: z.number().int().nonnegative().optional(),
  withdrawn: z.boolean().optional(),
});
export type PublicStandingRowDto = z.infer<typeof publicStandingRowSchema>;

export const getPublicStandingsResponseSchema = z.strictObject({
  standings: z.strictObject({
    rows: z.array(publicStandingRowSchema),
    /** Null unless the competition plays a Swiss fixture and has a table. */
    swiss: z
      .strictObject({
        roundsTotal: z.number().int().nonnegative(),
        roundsCompleted: z.number().int().nonnegative(),
        currentRound: z.number().int().positive().nullable(),
        isFinal: z.boolean(),
      })
      .nullable(),
    /** Null until the first approved result is projected. */
    updatedAt: z.string().datetime().nullable(),
  }),
});
export type GetPublicStandingsResponse = z.infer<typeof getPublicStandingsResponseSchema>;

export const publicEncounterStatusSchema = z.enum(["scheduled", "awaiting_result", "official"]);
export type PublicEncounterStatusDto = z.infer<typeof publicEncounterStatusSchema>;

export const publicCalendarEntrySchema = z.strictObject({
  roundNumber: z.number().int().positive(),
  scheduledStartAt: z.string().datetime(),
  homeTeamName: z.string(),
  awayTeamName: z.string(),
  status: publicEncounterStatusSchema,
});
export type PublicCalendarEntryDto = z.infer<typeof publicCalendarEntrySchema>;

export const getPublicCalendarResponseSchema = z.strictObject({
  calendar: z.strictObject({
    timeZone: z.string(),
    entries: z.array(publicCalendarEntrySchema),
  }),
});
export type GetPublicCalendarResponse = z.infer<typeof getPublicCalendarResponseSchema>;
