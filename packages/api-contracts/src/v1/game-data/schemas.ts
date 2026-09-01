import { z } from "zod";

import { EA_SEARCH_PLATFORM } from "./ea-search-platform.ts";

export const externalClubSchema = z.object({
  providerKey: z.enum(["ea-clubs", "manual", "screenshot-ocr"]),
  externalClubId: z.string(),
  name: z.string(),
  platform: z.string(),
  gameEdition: z.string(),
  imageUrl: z.string().url().nullable(),
});

export type ExternalClubDto = z.infer<typeof externalClubSchema>;

export const providerMatchTeamSchema = z.object({
  externalClubId: z.string(),
  name: z.string(),
  goals: z.number(),
  imageUrl: z.string().url().nullable(),
});

export const providerPlayerMatchStatsSchema = z.object({
  externalPlayerId: z.string(),
  displayName: z.string(),
  externalClubId: z.string(),
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

export const providerMatchSchema = z.object({
  id: z.string(),
  provider: z.object({
    key: z.enum(["ea-clubs", "manual", "screenshot-ocr"]),
    externalMatchId: z.string(),
  }),
  game: z.object({
    edition: z.string(),
    platform: z.string(),
    mode: z.string(),
  }),
  occurredAt: z.string().datetime(),
  home: providerMatchTeamSchema,
  away: providerMatchTeamSchema,
  players: z.array(providerPlayerMatchStatsSchema),
  metadata: z.object({
    durationSeconds: z.number().nullable(),
    wasDisconnected: z.boolean(),
    winnerByForfeit: z.boolean(),
    completeness: z.enum(["complete", "partial", "unknown"]),
  }),
});

export type ProviderMatchDto = z.infer<typeof providerMatchSchema>;

export const providerMatchListSchema = providerMatchSchema.omit({ players: true });

export type ProviderMatchListDto = z.infer<typeof providerMatchListSchema>;

export const gameDataProviderKeyQuerySchema = z.enum(["ea-clubs", "manual", "screenshot-ocr"]);

export type GameDataProviderKeyQuery = z.infer<typeof gameDataProviderKeyQuerySchema>;

export const searchClubsQuerySchema = z.object({
  query: z.string().min(1),
  providerKey: gameDataProviderKeyQuerySchema.default("ea-clubs"),
  platform: z.string().min(1).default(EA_SEARCH_PLATFORM.CROSS_GEN),
  gameEdition: z.string().min(1).default("fc26"),
});

export type SearchClubsQuery = z.infer<typeof searchClubsQuerySchema>;
export type SearchClubsQueryInput = z.input<typeof searchClubsQuerySchema>;

export const searchClubsResponseSchema = z.object({
  clubs: z.array(externalClubSchema),
});

export type SearchClubsResponse = z.infer<typeof searchClubsResponseSchema>;

export const getClubQuerySchema = z.object({
  providerKey: gameDataProviderKeyQuerySchema.default("ea-clubs"),
  platform: z.string().min(1).default(EA_SEARCH_PLATFORM.CROSS_GEN),
  gameEdition: z.string().min(1).default("fc26"),
});

export type GetClubQuery = z.infer<typeof getClubQuerySchema>;
export type GetClubQueryInput = z.input<typeof getClubQuerySchema>;

export const getClubResponseSchema = externalClubSchema;

export type GetClubResponse = z.infer<typeof getClubResponseSchema>;

export const getClubMatchesQuerySchema = z.object({
  providerKey: gameDataProviderKeyQuerySchema.default("ea-clubs"),
  platform: z.string().min(1).default(EA_SEARCH_PLATFORM.CROSS_GEN),
  gameEdition: z.string().min(1).default("fc26"),
  matchType: z.string().min(1).default("friendlyMatch"),
  maxResultCount: z.coerce.number().int().positive().max(100).default(50),
});

export type GetClubMatchesQuery = z.infer<typeof getClubMatchesQuerySchema>;
export type GetClubMatchesQueryInput = z.input<typeof getClubMatchesQuerySchema>;

export const getClubMatchesResponseSchema = z.object({
  matches: z.array(providerMatchSchema),
});

export type GetClubMatchesResponse = z.infer<typeof getClubMatchesResponseSchema>;

export const playerRecentProviderMatchSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("played"),
    match: providerMatchListSchema,
    appearance: providerPlayerMatchStatsSchema,
    listedExternalClubId: z.string(),
    listedMvpDisplayName: z.string().nullable(),
  }),
  z.object({
    kind: z.literal("not_played"),
    match: providerMatchListSchema,
    listedExternalClubId: z.string(),
    listedMvpDisplayName: z.string().nullable(),
  }),
]);

export type PlayerRecentProviderMatchDto = z.infer<typeof playerRecentProviderMatchSchema>;

export const getMyRecentMatchesQuerySchema = z.object({
  externalClubId: z.string().trim().min(1).optional(),
});

export type GetMyRecentMatchesQuery = z.infer<typeof getMyRecentMatchesQuerySchema>;
export type GetMyRecentMatchesQueryInput = z.input<typeof getMyRecentMatchesQuerySchema>;

export const getMyRecentMatchesResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("needs_club") }),
  z.object({ status: z.literal("needs_game_account") }),
  z.object({
    status: z.literal("ready"),
    matches: z.array(playerRecentProviderMatchSchema),
  }),
]);

export type GetMyRecentMatchesResponse = z.infer<typeof getMyRecentMatchesResponseSchema>;

export const getMyRecentMatchPathSchema = z.object({
  providerKey: gameDataProviderKeyQuerySchema,
  externalMatchId: z.string().trim().min(1),
});

export type GetMyRecentMatchPath = z.infer<typeof getMyRecentMatchPathSchema>;

export const getMyRecentMatchQuerySchema = z.object({
  externalClubId: z.string().trim().min(1).optional(),
});

export type GetMyRecentMatchQuery = z.infer<typeof getMyRecentMatchQuerySchema>;
export type GetMyRecentMatchQueryInput = z.input<typeof getMyRecentMatchQuerySchema>;

export const playerRecentProviderMatchDetailSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("played"),
    match: providerMatchSchema,
    appearance: providerPlayerMatchStatsSchema,
    listedExternalClubId: z.string(),
  }),
  z.object({
    kind: z.literal("not_played"),
    match: providerMatchSchema,
    listedExternalClubId: z.string(),
  }),
]);

export type PlayerRecentProviderMatchDetailDto = z.infer<
  typeof playerRecentProviderMatchDetailSchema
>;

export const getMyRecentMatchResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("needs_club") }),
  z.object({ status: z.literal("needs_game_account") }),
  z.object({ status: z.literal("not_found") }),
  z.object({
    status: z.literal("ready"),
    match: playerRecentProviderMatchDetailSchema,
  }),
]);

export type GetMyRecentMatchResponse = z.infer<typeof getMyRecentMatchResponseSchema>;

const playerGameStatTotalsSchema = z.object({
  goals: z.number(),
  assists: z.number(),
  shots: z.number(),
  passAttempts: z.number(),
  passesMade: z.number(),
  tackleAttempts: z.number(),
  tacklesMade: z.number(),
  saves: z.number(),
  yellowCards: z.number(),
  redCards: z.number(),
  mvpAwards: z.number(),
  rating: z.number(),
});

const playerGameStatRatesSchema = z.object({
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
  mvpAwards: z.number().nullable(),
  rating: z.number().nullable(),
});

const playerGameStatPartialSchema = z.object({
  minutes: z.boolean(),
  goals: z.boolean(),
  assists: z.boolean(),
  shots: z.boolean(),
  passAttempts: z.boolean(),
  passesMade: z.boolean(),
  tackleAttempts: z.boolean(),
  tacklesMade: z.boolean(),
  saves: z.boolean(),
  yellowCards: z.boolean(),
  redCards: z.boolean(),
  mvpAwards: z.boolean(),
  rating: z.boolean(),
});

export const playerGameStatBlockSchema = z.object({
  matchesPlayed: z.number().int().nonnegative(),
  wins: z.number().int().nonnegative(),
  draws: z.number().int().nonnegative(),
  losses: z.number().int().nonnegative(),
  minutes: z.number().nullable(),
  totals: playerGameStatTotalsSchema,
  averages: playerGameStatRatesSchema,
  partial: playerGameStatPartialSchema,
});

export const playerAttributeComponentSchema = z.object({
  key: z.enum([
    "goalsPerMatch",
    "shotsPerMatch",
    "shotAccuracy",
    "offensiveRoleRating",
    "passSuccess",
    "passVolume",
    "tacklesMadePerMatch",
    "tackleSuccess",
    "defensiveRoleRating",
    "averageRating",
    "winRate",
    "goalsAssistsPerMatch",
    "fewerRedsPerMatch",
  ]),
  weight: z.number().min(0).max(1),
  raw: z.number().nullable(),
  rawKind: z.enum(["perMatch", "percent", "rating", "score"]),
  score: z.number().nullable(),
  points: z.number().int(),
  confidence: z.number().min(0).max(1),
  sampleCount: z.number().int().nonnegative(),
});

export const playerAttributeCategorySchema = z.object({
  category: z.enum(["attack", "pass", "defense", "impact", "discipline"]),
  score: z.number().int().min(0).max(100),
  components: z.array(playerAttributeComponentSchema),
});

export const playerGameProfileSchema = z.object({
  identity: z.object({
    displayName: z.string().min(1),
    preferredPosition: z.string().min(1).nullable(),
    preferredRole: z.enum(["attack", "midfield", "defense", "goalkeeper", "unknown"]),
  }),
  sampleSize: z.number().int().nonnegative(),
  attributes: z.array(playerAttributeCategorySchema),
  evolution: z.array(
    z.object({
      occurredAt: z.string().datetime(),
      rating: z.number().nullable(),
      outcome: z.enum(["win", "draw", "loss", "unknown"]),
    }),
  ),
  summary: playerGameStatBlockSchema,
  byTeam: z.array(
    playerGameStatBlockSchema.extend({
      clubId: z.string().min(1),
      clubName: z.string().min(1),
    }),
  ),
  byPosition: z.array(
    playerGameStatBlockSchema.extend({
      position: z.string().min(1),
      role: z.enum(["attack", "midfield", "defense", "goalkeeper", "unknown"]),
    }),
  ),
});

export const getMyGameProfileQuerySchema = z
  .object({
    externalClubId: z.string().trim().min(1).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  })
  .superRefine((value, ctx) => {
    if ((value.from === undefined) !== (value.to === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: value.from === undefined ? ["from"] : ["to"],
        message: "from and to must be provided together",
      });
      return;
    }
    if (value.from !== undefined && value.to !== undefined && value.from >= value.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["to"],
        message: "to must be after from",
      });
    }
  });

export type GetMyGameProfileQuery = z.infer<typeof getMyGameProfileQuerySchema>;
export type GetMyGameProfileQueryInput = z.input<typeof getMyGameProfileQuerySchema>;

export const getMyGameProfileResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("needs_club") }),
  z.object({ status: z.literal("needs_game_account") }),
  z.object({
    status: z.literal("ready"),
    profile: playerGameProfileSchema,
  }),
]);

export type GetMyGameProfileResponse = z.infer<typeof getMyGameProfileResponseSchema>;
export type PlayerGameProfileDto = z.infer<typeof playerGameProfileSchema>;

export const enqueueProviderSyncJobRequestSchema = z.object({
  organizationId: z.string().trim().min(1),
  providerKey: z.literal("ea-clubs"),
  externalClubId: z.string().trim().min(1),
  platform: z.string().trim().min(1),
  gameEdition: z.string().trim().min(1),
  matchType: z.string().trim().min(1),
  maxResultCount: z.number().int().min(1).max(100),
});

export type EnqueueProviderSyncJobRequest = z.infer<typeof enqueueProviderSyncJobRequestSchema>;

export const providerSyncJobResponseSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().min(1),
  providerKey: z.literal("ea-clubs"),
  status: z.enum(["queued", "running", "succeeded", "retry_scheduled", "dead"]),
  attempt: z.number().int().nonnegative(),
  maxAttempts: z.number().int().positive(),
  requestId: z.string().min(1),
  availableAt: z.string().datetime().nullable(),
  leaseExpiresAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime(),
  lastErrorCode: z.string().min(1).optional(),
});

export type ProviderSyncJobResponse = z.infer<typeof providerSyncJobResponseSchema>;

export const providerHealthResponseSchema = z.object({
  providerKey: gameDataProviderKeyQuerySchema,
  status: z.enum(["healthy", "degraded", "unavailable", "unknown"]),
  circuitState: z.enum(["closed", "open", "half_open"]),
  observedAt: z.string().datetime(),
  windowStartedAt: z.string().datetime(),
  sampleSize: z.number().int().nonnegative(),
  lastSuccessfulAt: z.string().datetime().nullable(),
  lastFailureAt: z.string().datetime().nullable(),
  averageLatencyMs: z.number().int().nonnegative().nullable(),
  successCount: z.number().int().nonnegative(),
  failureCount: z.number().int().nonnegative(),
  cache: z.object({
    hits: z.number().int().nonnegative(),
    misses: z.number().int().nonnegative(),
    stale: z.number().int().nonnegative(),
  }),
});

export type ProviderHealthResponse = z.infer<typeof providerHealthResponseSchema>;
