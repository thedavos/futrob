import { z } from "zod";
import { gamePlatformSchema } from "../teams/schemas.ts";
import { acceptInvitationResponseSchema } from "../organizations/schemas.ts";

export const competitionStatusSchema = z.enum([
  "draft",
  "published",
  "paused",
  "finished",
  "archived",
]);
export type CompetitionStatusDto = z.infer<typeof competitionStatusSchema>;

export const competitionFormatSchema = z.enum([
  "league",
  "knockout",
  "groups-knockout",
  "league-playoffs",
]);
export type CompetitionFormatDto = z.infer<typeof competitionFormatSchema>;

export const competitionRegionSchema = z.enum([
  "america",
  "south-america",
  "north-central-america",
  "europe",
  "africa",
  "asia",
  "middle-east",
  "oceania",
]);
export type CompetitionRegionDto = z.infer<typeof competitionRegionSchema>;

export const competitionPlatformSchema = gamePlatformSchema;
export type CompetitionPlatformDto = z.infer<typeof competitionPlatformSchema>;

export const competitionDraftInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  gameEdition: z.string().trim().min(1).max(40),
  platform: competitionPlatformSchema,
  region: competitionRegionSchema,
  timeZone: z.string().trim().min(1).max(100),
  format: competitionFormatSchema,
});
export type CompetitionDraftInputDto = z.infer<typeof competitionDraftInputSchema>;

const competitionMatchRulesSchema = z.object({
  officialMatchesPerEncounter: z.union([z.literal(1), z.literal(2)]),
  resolutionMode: z.enum(["independent_matches", "aggregate_score"]),
  winPoints: z.number(),
  drawPoints: z.number(),
  lossPoints: z.number(),
  allowRescheduling: z.boolean(),
  maxReschedulesPerTeam: z.number().int().nonnegative().nullable(),
  minimumRescheduleNoticeHours: z.number().int().nonnegative(),
  rescheduleRequiresOpponentApproval: z.boolean(),
  rescheduleRequiresOrganizerApproval: z.boolean(),
});

export const competitionRulesSchema = z.object({
  version: z.number().int().positive(),
  regularStage: competitionMatchRulesSchema.nullable(),
  knockoutStage: competitionMatchRulesSchema.nullable(),
  awayGoalsEnabled: z.literal(false),
  maxRosterSize: z.number().int().positive().nullable(),
  requireVerifiedExternalClub: z.boolean(),
  createdAt: z.string().datetime(),
});
export type CompetitionRulesDto = z.infer<typeof competitionRulesSchema>;

export const competitionSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().min(1),
  name: z.string().min(1),
  status: competitionStatusSchema,
  modality: z.literal("fc-clubs"),
  gameEdition: z.string().min(1),
  platform: competitionPlatformSchema,
  region: competitionRegionSchema,
  timeZone: z.string().min(1),
  format: competitionFormatSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CompetitionDto = z.infer<typeof competitionSchema>;

export const competitionDraftSchema = z.object({
  competition: competitionSchema,
  rules: competitionRulesSchema,
});
export type CompetitionDraftDto = z.infer<typeof competitionDraftSchema>;

export const getCompetitionDraftResponseSchema = competitionDraftSchema;
export type GetCompetitionDraftResponse = z.infer<typeof getCompetitionDraftResponseSchema>;

export const acceptCompetitionInvitationResponseSchema = acceptInvitationResponseSchema.extend({
  competitionId: z.string().min(1),
  competitionName: z.string().min(1),
  destination: z.object({
    kind: z.literal("competition"),
    organizationId: z.string().min(1),
    competitionId: z.string().min(1),
  }),
});
export type AcceptCompetitionInvitationResponse = z.infer<
  typeof acceptCompetitionInvitationResponseSchema
>;

export const competitionEntryStatusSchema = z.enum(["pending", "approved", "rejected"]);
export type CompetitionEntryStatusDto = z.infer<typeof competitionEntryStatusSchema>;

export const competitionEntrySchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().min(1),
  competitionId: z.string().min(1),
  teamId: z.string().min(1),
  status: competitionEntryStatusSchema,
  createdAt: z.string().datetime(),
});
export type CompetitionEntryDto = z.infer<typeof competitionEntrySchema>;

export const registerTeamEntryRequestSchema = z.object({
  teamId: z.string().trim().min(1),
  creationKey: z.string().trim().min(1).max(160).optional(),
});
export type RegisterTeamEntryRequest = z.infer<typeof registerTeamEntryRequestSchema>;

export const registerTeamEntryResponseSchema = competitionEntrySchema;
export type RegisterTeamEntryResponse = z.infer<typeof registerTeamEntryResponseSchema>;

export const decideTeamEntryResponseSchema = competitionEntrySchema;
export type DecideTeamEntryResponse = z.infer<typeof decideTeamEntryResponseSchema>;
