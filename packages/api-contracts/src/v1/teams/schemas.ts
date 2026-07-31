import { z } from "zod";

export const gamePlatformSchema = z.enum([
  "playstation",
  "xbox",
  "pc",
  "nintendo-switch-1",
  "nintendo-switch-2",
]);
export type GamePlatformDto = z.infer<typeof gamePlatformSchema>;

export const playerGameAccountInputSchema = z.object({
  identifier: z.string().trim().min(1).max(80),
  platform: gamePlatformSchema,
  gameEdition: z.string().trim().min(1).max(40),
});
export type PlayerGameAccountInputDto = z.infer<typeof playerGameAccountInputSchema>;

export const playerProfileSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string().datetime(),
});
export type PlayerProfileDto = z.infer<typeof playerProfileSchema>;

export const playerGameAccountSchema = z.object({
  id: z.string().min(1),
  playerProfileId: z.string().min(1),
  identifier: z.string().min(1),
  platform: gamePlatformSchema,
  gameEdition: z.string().min(1),
  createdAt: z.string().datetime(),
});
export type PlayerGameAccountDto = z.infer<typeof playerGameAccountSchema>;

export const getMyPlayerProfileResponseSchema = z.object({
  profile: playerProfileSchema.nullable(),
  gameAccounts: z.array(playerGameAccountSchema),
});
export type GetMyPlayerProfileResponse = z.infer<typeof getMyPlayerProfileResponseSchema>;

export const addMyPlayerGameAccountRequestSchema = playerGameAccountInputSchema;
export type AddMyPlayerGameAccountRequest = z.infer<typeof addMyPlayerGameAccountRequestSchema>;

export const addMyPlayerGameAccountResponseSchema = z.object({
  profile: playerProfileSchema,
  gameAccount: playerGameAccountSchema,
});
export type AddMyPlayerGameAccountResponse = z.infer<typeof addMyPlayerGameAccountResponseSchema>;
