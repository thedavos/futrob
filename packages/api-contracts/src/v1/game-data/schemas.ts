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
