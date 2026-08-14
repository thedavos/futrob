import { z } from "zod";

/** EA often serializes numbers as strings; coerce when present. */
export const eaNumeric = z.coerce.number().optional().catch(undefined);

export const eaNumericRequired = z.coerce.number();

export const eaIdAsString = z.union([z.string(), z.number()]).transform((value) => String(value));

export const eaCustomKitSchema = z
  .object({
    crestAssetId: eaIdAsString.optional(),
  })
  .passthrough();

export type EaCustomKit = z.infer<typeof eaCustomKitSchema>;

export const eaClubInfoSchema = z
  .object({
    name: z.string(),
    clubId: eaIdAsString,
    regionId: z.unknown().optional(),
    teamId: z.unknown().optional(),
    customKit: eaCustomKitSchema.optional(),
  })
  .passthrough();

export type EaClubInfo = z.infer<typeof eaClubInfoSchema>;

export const eaLeaderboardEntrySchema = z
  .object({
    clubId: eaIdAsString.optional(),
    clubName: z.string().optional(),
    platform: z.string().optional(),
    clubInfo: eaClubInfoSchema.optional(),
  })
  .passthrough();

export type EaLeaderboardEntry = z.infer<typeof eaLeaderboardEntrySchema>;

export const eaSearchClubsResponseSchema = z.array(eaLeaderboardEntrySchema);

export const eaClubInfoMapSchema = z.record(z.string(), eaClubInfoSchema);

export type EaClubInfoMap = z.infer<typeof eaClubInfoMapSchema>;

export const eaMatchClubDetailsSchema = z
  .object({
    name: z.string().optional(),
    clubId: eaIdAsString.optional(),
    customKit: eaCustomKitSchema.optional(),
  })
  .passthrough();

export const eaMatchClubSchema = z
  .object({
    goals: eaNumeric,
    score: eaNumeric,
    goalsAgainst: eaNumeric,
    winnerByDnf: eaNumeric,
    TEAM: eaIdAsString.optional(),
    details: eaMatchClubDetailsSchema.optional(),
  })
  .passthrough();

export type EaMatchClub = z.infer<typeof eaMatchClubSchema>;

export const eaPlayerMatchStatsSchema = z
  .object({
    playername: z.string().optional(),
    goals: eaNumeric,
    assists: eaNumeric,
    rating: eaNumeric,
    pos: z.union([z.string(), z.number()]).optional().catch(undefined),
    shots: eaNumeric,
    passattempts: eaNumeric,
    passesmade: eaNumeric,
    tackleattempts: eaNumeric,
    tacklesmade: eaNumeric,
    saves: eaNumeric,
    yellowcards: eaNumeric,
    redcards: eaNumeric,
    mom: eaNumeric,
    secondsPlayed: eaNumeric,
    secondsplayed: eaNumeric,
  })
  .passthrough();

export type EaPlayerMatchStats = z.infer<typeof eaPlayerMatchStatsSchema>;

export const eaClubMatchSchema = z
  .object({
    matchId: eaIdAsString,
    timestamp: eaNumericRequired,
    clubs: z.record(z.string(), eaMatchClubSchema),
    players: z.record(z.string(), z.record(z.string(), eaPlayerMatchStatsSchema)).optional(),
  })
  .passthrough();

export type EaClubMatch = z.infer<typeof eaClubMatchSchema>;

/** EA returns `[]` when a match type has games, and `{}` (or null) when it has none. */
export const eaClubMatchesResponseSchema = z
  .unknown()
  .transform((value) => (Array.isArray(value) ? value : []))
  .pipe(
    z.array(z.unknown()).transform((items) =>
      items.flatMap((item) => {
        const parsed = eaClubMatchSchema.safeParse(item);
        return parsed.success ? [parsed.data] : [];
      }),
    ),
  );
