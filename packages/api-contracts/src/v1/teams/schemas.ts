import { z } from "zod";
import { competitionEntrySchema } from "../competitions/schemas.ts";
import { gamePlatformSchema } from "../game-platform.ts";

export { gamePlatformSchema };
export type { GamePlatformDto } from "../game-platform.ts";

export const playerGameAccountInputSchema = z.object({
  identifier: z.string().trim().min(1).max(80),
  platform: gamePlatformSchema,
  gameEdition: z.string().trim().min(1).max(40),
  providerExternalPlayerId: z.string().trim().min(1).max(80).optional(),
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
  providerExternalPlayerId: z.string().nullable(),
  platform: gamePlatformSchema,
  gameEdition: z.string().min(1),
  createdAt: z.string().datetime(),
});
export type PlayerGameAccountDto = z.infer<typeof playerGameAccountSchema>;

export const playerExternalClubSelectionInputSchema = z.object({
  providerKey: z.enum(["ea-clubs", "manual", "screenshot-ocr"]),
  externalClubId: z.string().trim().min(1).max(80),
  platform: z.string().trim().min(1).max(40),
  gameEdition: z.string().trim().min(1).max(40),
});
export type PlayerExternalClubSelectionInputDto = z.infer<
  typeof playerExternalClubSelectionInputSchema
>;

export const playerExternalClubAssociationSchema = z.object({
  playerProfileId: z.string().min(1),
  providerKey: z.enum(["ea-clubs", "manual", "screenshot-ocr"]),
  externalClubId: z.string().min(1),
  externalClubName: z.string().min(1),
  platform: z.string().min(1),
  gameEdition: z.string().min(1),
  imageUrl: z.string().url().nullable(),
  associatedAt: z.string().datetime(),
});
export type PlayerExternalClubAssociationDto = z.infer<typeof playerExternalClubAssociationSchema>;

export const getMyPlayerProfileResponseSchema = z.object({
  profile: playerProfileSchema.nullable(),
  gameAccounts: z.array(playerGameAccountSchema),
  externalClub: playerExternalClubAssociationSchema.nullable(),
});
export type GetMyPlayerProfileResponse = z.infer<typeof getMyPlayerProfileResponseSchema>;

export const addMyPlayerGameAccountRequestSchema = playerGameAccountInputSchema;
export type AddMyPlayerGameAccountRequest = z.infer<typeof addMyPlayerGameAccountRequestSchema>;

export const addMyPlayerGameAccountResponseSchema = z.object({
  profile: playerProfileSchema,
  gameAccount: playerGameAccountSchema,
});
export type AddMyPlayerGameAccountResponse = z.infer<typeof addMyPlayerGameAccountResponseSchema>;

export const associateMyPlayerExternalClubRequestSchema = playerExternalClubSelectionInputSchema;
export type AssociateMyPlayerExternalClubRequest = z.infer<
  typeof associateMyPlayerExternalClubRequestSchema
>;

export const associateMyPlayerExternalClubResponseSchema = z.object({
  profile: playerProfileSchema,
  externalClub: playerExternalClubAssociationSchema,
});
export type AssociateMyPlayerExternalClubResponse = z.infer<
  typeof associateMyPlayerExternalClubResponseSchema
>;

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

export const listOrganizationTeamsResponseSchema = z.object({ teams: z.array(teamSchema) });
export type ListOrganizationTeamsResponse = z.infer<typeof listOrganizationTeamsResponseSchema>;

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

export const listRosterResponseSchema = z.object({
  memberships: z.array(competitionRosterMembershipSchema),
});
export type ListRosterResponse = z.infer<typeof listRosterResponseSchema>;

export const changeRosterRoleRequestSchema = z.object({
  role: rosterMembershipRoleSchema,
});
export type ChangeRosterRoleRequest = z.infer<typeof changeRosterRoleRequestSchema>;

export const changeRosterRoleResponseSchema = competitionRosterMembershipSchema;
export type ChangeRosterRoleResponse = z.infer<typeof changeRosterRoleResponseSchema>;

export const rosterStateSchema = z.object({
  organizationId: z.string().min(1),
  competitionId: z.string().min(1),
  teamId: z.string().min(1),
  lockedAt: z.string().datetime().nullable(),
});
export type RosterStateDto = z.infer<typeof rosterStateSchema>;

export const closeRosterResponseSchema = rosterStateSchema;
export type CloseRosterResponse = z.infer<typeof closeRosterResponseSchema>;

export const openRosterResponseSchema = rosterStateSchema;
export type OpenRosterResponse = z.infer<typeof openRosterResponseSchema>;

export const connectTeamExternalClubRequestSchema = z.object({
  providerKey: z.enum(["ea-clubs", "manual", "screenshot-ocr"]),
  externalClubId: z.string().trim().min(1).max(80),
  externalClubName: z.string().trim().min(1).max(120),
  platform: z.string().trim().min(1).max(40),
  gameEdition: z.string().trim().min(1).max(40),
});
export type ConnectTeamExternalClubRequest = z.infer<typeof connectTeamExternalClubRequestSchema>;

export const teamExternalClubConnectionSchema = z.object({
  teamId: z.string().min(1),
  providerKey: z.enum(["ea-clubs", "manual", "screenshot-ocr"]),
  externalClubId: z.string().min(1),
  externalClubName: z.string().min(1),
  platform: z.string().min(1),
  gameEdition: z.string().min(1),
});
export type TeamExternalClubConnectionDto = z.infer<typeof teamExternalClubConnectionSchema>;

export const connectTeamExternalClubResponseSchema = teamExternalClubConnectionSchema;
export type ConnectTeamExternalClubResponse = z.infer<typeof connectTeamExternalClubResponseSchema>;

export const getTeamExternalClubResponseSchema = teamExternalClubConnectionSchema.nullable();
export type GetTeamExternalClubResponse = z.infer<typeof getTeamExternalClubResponseSchema>;

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

export const createRosterInvitationRequestSchema = z.object({
  role: rosterMembershipRoleSchema.default("player"),
  expiresInMs: z.number().int().positive().optional(),
  redeemPolicy: z.enum(["single", "multi"]).default("single"),
});
export type CreateRosterInvitationRequest = z.infer<typeof createRosterInvitationRequestSchema>;
export type CreateRosterInvitationRequestInput = z.input<
  typeof createRosterInvitationRequestSchema
>;

export const rosterInvitationMetaSchema = z.object({
  invitationId: z.string().min(1),
  organizationId: z.string().min(1),
  competitionId: z.string().min(1),
  teamId: z.string().min(1),
  role: rosterMembershipRoleSchema,
  status: z.enum(["pending", "accepted", "revoked", "expired"]),
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});
export type RosterInvitationMetaDto = z.infer<typeof rosterInvitationMetaSchema>;

export const createRosterInvitationResponseSchema = rosterInvitationMetaSchema.extend({
  token: z.string().min(1),
});
export type CreateRosterInvitationResponse = z.infer<typeof createRosterInvitationResponseSchema>;

export const acceptRosterInvitationRequestSchema = z.object({
  token: z.string().trim().min(1),
});
export type AcceptRosterInvitationRequest = z.infer<typeof acceptRosterInvitationRequestSchema>;

export const acceptRosterInvitationResponseSchema = competitionRosterMembershipSchema;
export type AcceptRosterInvitationResponse = z.infer<typeof acceptRosterInvitationResponseSchema>;

export const competitionTeamManagementListQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(25),
});
export type CompetitionTeamManagementListQuery = z.infer<
  typeof competitionTeamManagementListQuerySchema
>;

export const competitionTeamManagementRosterSchema = z.object({
  state: z.enum(["open", "closed"]),
  memberCount: z.number().int().nonnegative(),
  maxSize: z.number().int().positive(),
  lockedAt: z.string().datetime().nullable(),
});
export type CompetitionTeamManagementRosterDto = z.infer<
  typeof competitionTeamManagementRosterSchema
>;

export const competitionTeamManagementSummarySchema = z.object({
  team: teamSchema,
  entry: competitionEntrySchema,
  roster: competitionTeamManagementRosterSchema,
  externalClub: teamExternalClubConnectionSchema.nullable(),
});
export type CompetitionTeamManagementSummaryDto = z.infer<
  typeof competitionTeamManagementSummarySchema
>;

export const competitionTeamManagementMemberSchema = z.object({
  membership: competitionRosterMembershipSchema,
  presentation: z.object({
    displayName: z.string().min(1),
    avatarUrl: z.string().url().nullable(),
  }),
});
export type CompetitionTeamManagementMemberDto = z.infer<
  typeof competitionTeamManagementMemberSchema
>;

export const competitionTeamManagementListResponseSchema = z.object({
  items: z.array(competitionTeamManagementSummarySchema),
  nextCursor: z.string().min(1).nullable(),
});
export type CompetitionTeamManagementListResponse = z.infer<
  typeof competitionTeamManagementListResponseSchema
>;

export const competitionTeamManagementDetailResponseSchema =
  competitionTeamManagementSummarySchema.extend({
    members: z.array(competitionTeamManagementMemberSchema),
  });
export type CompetitionTeamManagementDetailResponse = z.infer<
  typeof competitionTeamManagementDetailResponseSchema
>;
