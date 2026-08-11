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
