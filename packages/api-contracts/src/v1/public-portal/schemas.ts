import { z } from "zod";
import {
  competitionCoverPresetSchema,
  competitionFormatSchema,
  competitionPlatformSchema,
  competitionRegionSchema,
} from "../competitions/schemas.ts";
import { rankingKindSchema } from "../statistics/schemas.ts";

/**
 * Anonymous, cacheable reads of a published competition (ADR-0024).
 *
 * Every object is strict: an unexpected key fails the response parse in the API (a 500
 * instead of a leak) and fails `parse` in the SDK. These shapes are the allowlist, so
 * adding a field here is the only way for new data to reach a spectator.
 */
export const publicCompetitionKeySchema = z.string().min(1).max(128);

/** The organization part of a public URL (ADR-0024); format checks stay in the domain. */
export const publicOrganizationSlugSchema = z.string().min(1).max(64);

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
  buchholz: z.number().int().nonnegative().optional(),
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

/** Goals of one approved official match, home-oriented. Nothing else of the result. */
export const publicMatchScoreSchema = z.strictObject({
  homeGoals: z.number().int().nonnegative(),
  awayGoals: z.number().int().nonnegative(),
});
export type PublicMatchScoreDto = z.infer<typeof publicMatchScoreSchema>;

/** Official matches in slot order; null until the Encounter has an approved result. */
const publicScoreSchema = z.array(publicMatchScoreSchema).min(1).max(2).nullable();

export const publicCalendarEntrySchema = z.strictObject({
  roundNumber: z.number().int().positive(),
  scheduledStartAt: z.string().datetime(),
  homeTeamName: z.string(),
  awayTeamName: z.string(),
  status: publicEncounterStatusSchema,
  score: publicScoreSchema,
});
export type PublicCalendarEntryDto = z.infer<typeof publicCalendarEntrySchema>;

export const getPublicCalendarResponseSchema = z.strictObject({
  calendar: z.strictObject({
    timeZone: z.string(),
    entries: z.array(publicCalendarEntrySchema),
  }),
});
export type GetPublicCalendarResponse = z.infer<typeof getPublicCalendarResponseSchema>;

export const getPublicTeamsResponseSchema = z.strictObject({
  teams: z.array(z.strictObject({ name: z.string() })),
});
export type GetPublicTeamsResponse = z.infer<typeof getPublicTeamsResponseSchema>;

export const publicStageRulesSchema = z.strictObject({
  stage: z.enum(["regular", "knockout"]),
  winPoints: z.number(),
  drawPoints: z.number(),
  lossPoints: z.number(),
  officialMatchesPerEncounter: z.union([z.literal(1), z.literal(2)]),
  resolutionMode: z.enum(["independent_matches", "aggregate_score"]),
  rescheduling: z.discriminatedUnion("allowed", [
    z.strictObject({ allowed: z.literal(false) }),
    z.strictObject({
      allowed: z.literal(true),
      /** Null means no limit. */
      maxPerTeam: z.number().int().nonnegative().nullable(),
      minimumNoticeHours: z.number().int().nonnegative(),
    }),
  ]),
});
export type PublicStageRulesDto = z.infer<typeof publicStageRulesSchema>;

export const getPublicRulesResponseSchema = z.strictObject({
  rules: z.strictObject({
    format: competitionFormatSchema,
    /** Null only when the competition has no stored rules. */
    teams: z
      .strictObject({
        min: z.number().int().positive(),
        max: z.number().int().positive().nullable(),
      })
      .nullable(),
    stages: z.array(publicStageRulesSchema),
    /** Null means the platform default roster size. */
    maxRosterSize: z.number().int().positive().nullable(),
  }),
});
export type GetPublicRulesResponse = z.infer<typeof getPublicRulesResponseSchema>;

/** Who fills a bracket side, by public name or position; never an internal id. */
export const publicBracketSideSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("team"), name: z.string() }),
  z.strictObject({ kind: z.literal("bye") }),
  z.strictObject({
    kind: z.literal("winner"),
    roundNumber: z.number().int().positive(),
    order: z.number().int().positive(),
  }),
  z.strictObject({
    kind: z.literal("group_rank"),
    group: z.string().regex(/^[A-Z]$/),
    rank: z.number().int().positive(),
  }),
  z.strictObject({ kind: z.literal("stage_rank"), rank: z.number().int().positive() }),
  z.strictObject({ kind: z.literal("pending") }),
]);
export type PublicBracketSideDto = z.infer<typeof publicBracketSideSchema>;

export const publicBracketEncounterSchema = z.strictObject({
  order: z.number().int().positive(),
  scheduledStartAt: z.string().datetime(),
  officialMatchCount: z.union([z.literal(1), z.literal(2)]),
  home: publicBracketSideSchema,
  away: publicBracketSideSchema,
  status: z.enum(["scheduled", "awaiting_result", "official", "closed"]),
  score: publicScoreSchema,
});
export type PublicBracketEncounterDto = z.infer<typeof publicBracketEncounterSchema>;

export const publicBracketStageSchema = z.strictObject({
  kind: z.enum(["knockout", "playoffs"]),
  rounds: z.array(
    z.strictObject({
      number: z.number().int().positive(),
      scheduledStartAt: z.string().datetime(),
      encounters: z.array(publicBracketEncounterSchema),
    }),
  ),
});
export type PublicBracketStageDto = z.infer<typeof publicBracketStageSchema>;

export const getPublicBracketResponseSchema = z.strictObject({
  /** Null without a fixture or when the format has no elimination stage. */
  bracket: z
    .strictObject({
      timeZone: z.string(),
      stages: z.array(publicBracketStageSchema),
    })
    .nullable(),
});
export type GetPublicBracketResponse = z.infer<typeof getPublicBracketResponseSchema>;

export const publicRankingKindSchema = rankingKindSchema;
export type PublicRankingKindDto = z.infer<typeof publicRankingKindSchema>;

export const getPublicRankingResponseSchema = z.strictObject({
  ranking: z.strictObject({
    kind: publicRankingKindSchema,
    rows: z.array(
      z.strictObject({
        position: z.number().int().positive(),
        /** The game account the player declared on the Team roster. */
        playerName: z.string(),
        teamName: z.string().nullable(),
        value: z.number(),
        matchesPlayed: z.number().int().nonnegative(),
      }),
    ),
    /** Null until the first approved result is projected. */
    updatedAt: z.string().datetime().nullable(),
  }),
});
export type GetPublicRankingResponse = z.infer<typeof getPublicRankingResponseSchema>;

/** A published competition as crawlers see it (sitemap): its public address and freshness only. */
export const publicCompetitionListingSchema = z.strictObject({
  organizationSlug: publicOrganizationSlugSchema,
  competitionKey: publicCompetitionKeySchema,
  updatedAt: z.string().datetime(),
});
export type PublicCompetitionListingDto = z.infer<typeof publicCompetitionListingSchema>;

export const listPublicCompetitionsResponseSchema = z.strictObject({
  competitions: z.array(publicCompetitionListingSchema),
});
export type ListPublicCompetitionsResponse = z.infer<typeof listPublicCompetitionsResponseSchema>;
