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

export const rosterMembershipRoleSchema = z.enum(["player", "captain", "vice_captain"]);
export type RosterMembershipRoleDto = z.infer<typeof rosterMembershipRoleSchema>;

export const teamSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().min(1),
  name: z.string().min(1),
  createdAt: z.string().datetime(),
});
export type TeamDto = z.infer<typeof teamSchema>;

export const createTeamRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  creationKey: z.string().trim().min(1).max(160).optional(),
});
export type CreateTeamRequest = z.infer<typeof createTeamRequestSchema>;

export const createTeamResponseSchema = teamSchema;
export type CreateTeamResponse = z.infer<typeof createTeamResponseSchema>;

export const competitionRosterMembershipSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().min(1),
  competitionId: z.string().min(1),
  teamId: z.string().min(1),
  playerProfileId: z.string().min(1),
  gameAccountId: z.string().min(1).nullable(),
  role: rosterMembershipRoleSchema,
  createdAt: z.string().datetime(),
});
export type CompetitionRosterMembershipDto = z.infer<typeof competitionRosterMembershipSchema>;

export const addToRosterRequestSchema = z.object({
  playerProfileId: z.string().trim().min(1),
  gameAccountId: z.string().trim().min(1).nullable().optional(),
  role: rosterMembershipRoleSchema.default("player"),
});
export type AddToRosterRequest = z.infer<typeof addToRosterRequestSchema>;

export const addToRosterResponseSchema = competitionRosterMembershipSchema;
export type AddToRosterResponse = z.infer<typeof addToRosterResponseSchema>;

export const playerTeamMembershipSchema = z.object({
  membership: competitionRosterMembershipSchema,
  team: teamSchema,
  active: z.boolean(),
});
export type PlayerTeamMembershipDto = z.infer<typeof playerTeamMembershipSchema>;

export const getMyTeamsResponseSchema = z.object({
  teams: z.array(playerTeamMembershipSchema),
  activeRosterMembershipId: z.string().min(1).nullable(),
});
export type GetMyTeamsResponse = z.infer<typeof getMyTeamsResponseSchema>;

export const setActiveTeamRequestSchema = z.object({
  rosterMembershipId: z.string().trim().min(1),
});
export type SetActiveTeamRequest = z.infer<typeof setActiveTeamRequestSchema>;

export const setActiveTeamResponseSchema = z.object({
  actorId: z.string().min(1),
  rosterMembershipId: z.string().min(1),
  updatedAt: z.string().datetime(),
});
export type SetActiveTeamResponse = z.infer<typeof setActiveTeamResponseSchema>;
