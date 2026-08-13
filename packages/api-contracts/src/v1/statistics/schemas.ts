import { z } from "zod";

export const playerStatisticMetricSchema = z.enum([
  "goals",
  "assists",
  "shots",
  "passAttempts",
  "passesMade",
  "tackleAttempts",
  "tacklesMade",
  "saves",
  "yellowCards",
  "redCards",
  "mvpAwards",
  "rating",
]);

export const playerStatisticTotalsSchema = z.record(playerStatisticMetricSchema, z.number());
export const playerStatisticRatesSchema = z.record(
  playerStatisticMetricSchema,
  z.number().nullable(),
);
export const playerStatisticPartialFlagsSchema = z.record(
  z.union([playerStatisticMetricSchema, z.literal("minutes")]),
  z.boolean(),
);

export const playerPersonalStatsSchema = z.object({
  playerProfileId: z.string().min(1),
  matchesPlayed: z.number().int().nonnegative(),
  minutes: z.number().nonnegative(),
  totals: playerStatisticTotalsSchema,
  averages: playerStatisticRatesSchema,
  per90: playerStatisticRatesSchema,
  partial: playerStatisticPartialFlagsSchema,
  sourceRevisionMax: z.number().int().nonnegative(),
  updatedAt: z.string().datetime(),
});

export type PlayerPersonalStatsDto = z.infer<typeof playerPersonalStatsSchema>;

export const getMyStatisticsResponseSchema = z.object({
  statistics: playerPersonalStatsSchema.nullable(),
});

export type GetMyStatisticsResponse = z.infer<typeof getMyStatisticsResponseSchema>;

const personalStatisticsFilters = {
  competitionId: z.string().trim().min(1).optional(),
  teamId: z.string().trim().min(1).optional(),
  gameEdition: z.string().trim().min(1).max(40).optional(),
  platform: z.string().trim().min(1).max(40).optional(),
  position: z.string().trim().min(1).max(80).optional(),
} as const;

export const getMyStatisticsQuerySchema = z.object(personalStatisticsFilters);

export type GetMyStatisticsQuery = z.infer<typeof getMyStatisticsQuerySchema>;

export const playerMatchContributionSchema = z.object({
  id: z.string().min(1),
  officialResultId: z.string().min(1),
  revision: z.number().int().positive(),
  encounterId: z.string().min(1),
  competitionId: z.string().min(1),
  organizationId: z.string().min(1),
  officialSlot: z.union([z.literal(1), z.literal(2)]),
  teamId: z.string().min(1).nullable(),
  correlationStatus: z.enum(["matched", "unmatched", "ambiguous"]),
  externalPlayerId: z.string().min(1),
  displayName: z.string().min(1),
  externalClubId: z.string().min(1),
  platform: z.string().min(1),
  gameEdition: z.string().min(1),
  position: z.string().nullable(),
  minutesPlayed: z.number().nullable(),
  goals: z.number().nullable(),
  assists: z.number().nullable(),
  shots: z.number().nullable(),
  passAttempts: z.number().nullable(),
  passesMade: z.number().nullable(),
  tackleAttempts: z.number().nullable(),
  tacklesMade: z.number().nullable(),
  saves: z.number().nullable(),
  yellowCards: z.number().nullable(),
  redCards: z.number().nullable(),
  isMvp: z.boolean().nullable(),
  rating: z.number().nullable(),
});

export type PlayerMatchContributionDto = z.infer<typeof playerMatchContributionSchema>;

export const getMyMatchesQuerySchema = z.object({
  ...personalStatisticsFilters,
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type GetMyMatchesQuery = z.infer<typeof getMyMatchesQuerySchema>;

export const getMyMatchesResponseSchema = z.object({
  matches: z.array(playerMatchContributionSchema),
  nextCursor: z.string().nullable(),
});

export type GetMyMatchesResponse = z.infer<typeof getMyMatchesResponseSchema>;
