import { z } from "zod";
import { gamePlatformSchema } from "../game-platform.ts";
import { acceptInvitationResponseSchema } from "../organizations/schemas.ts";

export const competitionStatusSchema = z.enum([
  "draft",
  "registration",
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

export const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const competitionTeamRangeSchema = z.object({
  min: z.number().int().min(2).max(256),
  max: z.number().int().min(2).max(256).nullable(),
});
export type CompetitionTeamRangeDto = z.infer<typeof competitionTeamRangeSchema>;

export const competitionScheduleSchema = z.object({
  startsOn: calendarDateSchema.nullable(),
  endsOn: calendarDateSchema.nullable(),
});
export type CompetitionScheduleDto = z.infer<typeof competitionScheduleSchema>;

export const competitionCoverPresetSchema = z.enum([
  "cup",
  "classic",
  "friendlies",
  "groups",
  "league",
  "lightning",
  "playoffs",
  "pre-season",
  "supercup",
]);
export type CompetitionCoverPresetDto = z.infer<typeof competitionCoverPresetSchema>;

export const competitionCoverSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("preset"), preset: competitionCoverPresetSchema }),
  z.object({ kind: z.literal("upload"), key: z.string().min(1).max(300) }),
]);
export type CompetitionCoverDto = z.infer<typeof competitionCoverSchema>;

export const competitionDraftInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  gameEdition: z.string().trim().min(1).max(40),
  platform: competitionPlatformSchema,
  region: competitionRegionSchema,
  timeZone: z.string().trim().min(1).max(100),
  format: competitionFormatSchema,
  /** Omit to keep the stored value (create: defaults). */
  teams: competitionTeamRangeSchema.optional(),
  schedule: competitionScheduleSchema.optional(),
  cover: competitionCoverSchema.optional(),
});
export type CompetitionDraftInputDto = z.infer<typeof competitionDraftInputSchema>;

export const competitionMatchRulesSchema = z.object({
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
export type CompetitionMatchRulesDto = z.infer<typeof competitionMatchRulesSchema>;

export const competitionRulesSchema = z.object({
  version: z.number().int().positive(),
  regularStage: competitionMatchRulesSchema.nullable(),
  knockoutStage: competitionMatchRulesSchema.nullable(),
  awayGoalsEnabled: z.literal(false),
  maxRosterSize: z.number().int().positive().nullable(),
  createdAt: z.string().datetime(),
});
export type CompetitionRulesDto = z.infer<typeof competitionRulesSchema>;

export const updateCompetitionDraftRequestSchema = competitionDraftInputSchema.extend({
  rules: z.object({
    regularStage: competitionMatchRulesSchema.nullable(),
    knockoutStage: competitionMatchRulesSchema.nullable(),
    maxRosterSize: z.number().int().positive().nullable(),
  }),
});
export type UpdateCompetitionDraftRequest = z.infer<typeof updateCompetitionDraftRequestSchema>;

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
  teams: competitionTeamRangeSchema,
  schedule: competitionScheduleSchema,
  cover: competitionCoverSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CompetitionDto = z.infer<typeof competitionSchema>;

export const competitionDraftSchema = z.object({
  competition: competitionSchema,
  rules: competitionRulesSchema,
});
export type CompetitionDraftDto = z.infer<typeof competitionDraftSchema>;

export const updateCompetitionDraftResponseSchema = competitionDraftSchema;
export type UpdateCompetitionDraftResponse = z.infer<typeof updateCompetitionDraftResponseSchema>;

export const getCompetitionDraftResponseSchema = competitionDraftSchema;
export type GetCompetitionDraftResponse = z.infer<typeof getCompetitionDraftResponseSchema>;

export const createCompetitionDraftRequestSchema = competitionDraftInputSchema.extend({
  /** Client-generated; a retry returns the same draft and reuses the uploaded cover key. */
  creationKey: z
    .string()
    .regex(/^[A-Za-z0-9_-]{8,120}$/)
    .optional(),
});
export type CreateCompetitionDraftRequest = z.infer<typeof createCompetitionDraftRequestSchema>;

export const createCompetitionDraftResponseSchema = competitionDraftSchema;
export type CreateCompetitionDraftResponse = z.infer<typeof createCompetitionDraftResponseSchema>;

export const listOrganizationCompetitionsResponseSchema = z.object({
  competitions: z.array(competitionSchema),
});
export type ListOrganizationCompetitionsResponse = z.infer<
  typeof listOrganizationCompetitionsResponseSchema
>;

export const accessibleCompetitionSchema = z.object({
  competition: competitionSchema,
  role: z.enum(["staff", "captain", "vice_captain", "player"]),
});
export const listAccessibleCompetitionsResponseSchema = z.object({
  competitions: z.array(accessibleCompetitionSchema),
});
export type AccessibleCompetitionDto = z.infer<typeof accessibleCompetitionSchema>;
export type ListAccessibleCompetitionsResponse = z.infer<
  typeof listAccessibleCompetitionsResponseSchema
>;

export const discoverableCompetitionStatusSchema = z.enum([
  "registration",
  "published",
  "paused",
  "finished",
]);
export type DiscoverableCompetitionStatusDto = z.infer<typeof discoverableCompetitionStatusSchema>;

export const exploreCompetitionsSortSchema = z.enum(["updated-desc", "name-asc"]);
export type ExploreCompetitionsSortDto = z.infer<typeof exploreCompetitionsSortSchema>;

function optionalQuery<T extends z.ZodType>(schema: T) {
  return z
    .union([schema, z.literal("")])
    .optional()
    .transform((value) => (value === "" || value === undefined ? undefined : value));
}

export const exploreCompetitionsQuerySchema = z.object({
  q: optionalQuery(z.string().trim().min(1).max(120)),
  format: optionalQuery(competitionFormatSchema),
  status: optionalQuery(discoverableCompetitionStatusSchema),
  region: optionalQuery(competitionRegionSchema),
  platform: optionalQuery(competitionPlatformSchema),
  sort: optionalQuery(exploreCompetitionsSortSchema).transform((value) => value ?? "updated-desc"),
  cursor: optionalQuery(z.string().min(1)),
  limit: z.coerce.number().int().min(1).max(48).default(24),
});
export type ExploreCompetitionsQuery = z.infer<typeof exploreCompetitionsQuerySchema>;
export type ExploreCompetitionsQueryInput = z.input<typeof exploreCompetitionsQuerySchema>;

export const exploreCompetitionSchema = z.object({
  competition: competitionSchema,
  organization: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
  }),
  approvedTeamCount: z.number().int().nonnegative(),
});
export type ExploreCompetitionDto = z.infer<typeof exploreCompetitionSchema>;

export const exploreCompetitionsResponseSchema = z.object({
  items: z.array(exploreCompetitionSchema),
  total: z.number().int().nonnegative(),
  nextCursor: z.string().min(1).nullable(),
});
export type ExploreCompetitionsResponse = z.infer<typeof exploreCompetitionsResponseSchema>;

export const getExploreCompetitionResponseSchema = exploreCompetitionSchema;
export type GetExploreCompetitionResponse = z.infer<typeof getExploreCompetitionResponseSchema>;

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

export const competitionParticipantInputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("existing-team"), teamId: z.string().trim().min(1) }),
  z.object({
    kind: z.literal("new-team"),
    name: z.string().trim().min(1).max(120),
    creationKey: z.string().trim().min(1).max(160),
  }),
]);
export type CompetitionParticipantInput = z.infer<typeof competitionParticipantInputSchema>;

export const listCompetitionParticipantsResponseSchema = z.object({
  participants: z.array(competitionEntrySchema),
});
export type ListCompetitionParticipantsResponse = z.infer<
  typeof listCompetitionParticipantsResponseSchema
>;

export const addCompetitionParticipantResponseSchema = competitionEntrySchema;
export type AddCompetitionParticipantResponse = z.infer<
  typeof addCompetitionParticipantResponseSchema
>;

export const publishCompetitionResponseSchema = competitionDraftSchema;
export type PublishCompetitionResponse = z.infer<typeof publishCompetitionResponseSchema>;
export const competitionRegistrationResponseSchema = competitionDraftSchema;
export type CompetitionRegistrationResponse = z.infer<typeof competitionRegistrationResponseSchema>;

export const registerTeamEntryRequestSchema = z.object({
  teamId: z.string().trim().min(1),
  creationKey: z.string().trim().min(1).max(160).optional(),
});
export type RegisterTeamEntryRequest = z.infer<typeof registerTeamEntryRequestSchema>;

export const registerTeamEntryResponseSchema = competitionEntrySchema;
export type RegisterTeamEntryResponse = z.infer<typeof registerTeamEntryResponseSchema>;

export const decideTeamEntryResponseSchema = competitionEntrySchema;
export type DecideTeamEntryResponse = z.infer<typeof decideTeamEntryResponseSchema>;

export const applyToCompetitionRequestSchema = z.object({
  teamName: z.string().trim().min(1).max(120),
  creationKey: z.string().min(8).max(200),
});
export type ApplyToCompetitionRequest = z.infer<typeof applyToCompetitionRequestSchema>;

export const competitionApplicationSchema = z.object({
  entryId: z.string(),
  status: competitionEntryStatusSchema,
  teamId: z.string(),
  teamName: z.string(),
  createdAt: z.string(),
});
export type CompetitionApplicationDto = z.infer<typeof competitionApplicationSchema>;

export const applyToCompetitionResponseSchema = competitionApplicationSchema;
export type ApplyToCompetitionResponse = z.infer<typeof applyToCompetitionResponseSchema>;

export const getMyCompetitionApplicationResponseSchema = z.object({
  application: competitionApplicationSchema.nullable(),
});
export type GetMyCompetitionApplicationResponse = z.infer<
  typeof getMyCompetitionApplicationResponseSchema
>;

export const updateCompetitionCoverRequestSchema = z.object({ cover: competitionCoverSchema });
export type UpdateCompetitionCoverRequest = z.infer<typeof updateCompetitionCoverRequestSchema>;
export const updateCompetitionCoverResponseSchema = competitionDraftSchema;
export type UpdateCompetitionCoverResponse = z.infer<typeof updateCompetitionCoverResponseSchema>;
