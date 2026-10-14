import { z } from "zod";
import { gamePlatformSchema } from "../game-platform.ts";
import {
  competitionApplicationSchema,
  competitionPlatformSchema,
  competitionStatusSchema,
} from "./schemas.ts";

/** Shared with the domain: 280 characters, 3 to search, 10 results (ADR-0023). */
export const ENTRY_INVITATION_LIMITS = {
  messageMaxLength: 280,
  searchMinLength: 3,
  searchMaxLength: 64,
} as const;

export const entryInvitationStatusSchema = z.enum(["pending", "accepted", "declined", "revoked"]);
export type EntryInvitationStatusDto = z.infer<typeof entryInvitationStatusSchema>;

/** A directed invitation as the organizer sees it. */
export const sentEntryInvitationSchema = z.object({
  id: z.string().min(1),
  inviteeActorId: z.string().min(1),
  inviteeLabel: z.string().nullable(),
  message: z.string().nullable(),
  status: entryInvitationStatusSchema,
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime().nullable(),
  respondedAt: z.string().datetime().nullable(),
  acceptedEntryId: z.string().nullable(),
});
export type SentEntryInvitationDto = z.infer<typeof sentEntryInvitationSchema>;

export const listSentEntryInvitationsResponseSchema = z.object({
  invitations: z.array(sentEntryInvitationSchema),
});
export type ListSentEntryInvitationsResponse = z.infer<
  typeof listSentEntryInvitationsResponseSchema
>;

export const inviteTeamCaptainRequestSchema = z.object({
  inviteeActorId: z.string().trim().min(1),
  inviteeLabel: z.string().trim().min(1).max(120),
  message: z.string().trim().max(ENTRY_INVITATION_LIMITS.messageMaxLength).nullable().optional(),
});
export type InviteTeamCaptainRequest = z.infer<typeof inviteTeamCaptainRequestSchema>;

/** The competition's shareable link. The client builds the URL from `code`. */
export const entryInvitationLinkSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  createdAt: z.string().datetime(),
});
export type EntryInvitationLinkDto = z.infer<typeof entryInvitationLinkSchema>;

export const entryInvitationLinkResponseSchema = z.object({ link: entryInvitationLinkSchema });
export type EntryInvitationLinkResponse = z.infer<typeof entryInvitationLinkResponseSchema>;

export const searchEntryInviteesQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(ENTRY_INVITATION_LIMITS.searchMinLength)
    .max(ENTRY_INVITATION_LIMITS.searchMaxLength),
});
export type SearchEntryInviteesQuery = z.infer<typeof searchEntryInviteesQuerySchema>;

/** A player the organizer may invite, with the club they declared. */
export const entryInviteeCandidateSchema = z.object({
  actorId: z.string().min(1),
  gamertag: z.string().min(1),
  platform: gamePlatformSchema,
  gameEdition: z.string(),
  club: z
    .object({
      name: z.string(),
      imageUrl: z.string().nullable(),
      platform: z.string(),
    })
    .nullable(),
  /** Already has a team in this competition; inviting would fail. */
  inCompetition: z.boolean(),
  /** Already has a pending invitation to this competition. */
  invitationPending: z.boolean(),
});
export type EntryInviteeCandidateDto = z.infer<typeof entryInviteeCandidateSchema>;

export const searchEntryInviteesResponseSchema = z.object({
  players: z.array(entryInviteeCandidateSchema),
});
export type SearchEntryInviteesResponse = z.infer<typeof searchEntryInviteesResponseSchema>;

const invitedCompetitionSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().min(1),
  organizationName: z.string(),
  name: z.string(),
  platform: competitionPlatformSchema,
  gameEdition: z.string(),
  status: competitionStatusSchema,
});

/** What the invited player sees before accepting. */
export const entryInvitationPreviewSchema = z.object({
  invitation: z.object({
    id: z.string().min(1),
    channel: z.enum(["directed", "link"]),
    status: entryInvitationStatusSchema,
    message: z.string().nullable(),
    expiresAt: z.string().datetime().nullable(),
  }),
  competition: invitedCompetitionSchema,
  suggestedTeamName: z.string().nullable(),
  /** The team the player already has in this competition, if any. */
  existing: competitionApplicationSchema.nullable(),
});
export type EntryInvitationPreviewDto = z.infer<typeof entryInvitationPreviewSchema>;

export const acceptEntryInvitationRequestSchema = z.object({
  teamName: z.string().trim().min(1).max(120),
  creationKey: z.string().min(8).max(200),
});
export type AcceptEntryInvitationRequest = z.infer<typeof acceptEntryInvitationRequestSchema>;

export const acceptEntryInvitationResponseSchema = z.object({
  organizationId: z.string().min(1),
  competitionId: z.string().min(1),
  application: competitionApplicationSchema,
});
export type AcceptEntryInvitationResponse = z.infer<typeof acceptEntryInvitationResponseSchema>;

/** A directed invitation in the invited player's inbox. */
export const myEntryInvitationSchema = z.object({
  id: z.string().min(1),
  status: entryInvitationStatusSchema,
  message: z.string().nullable(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime().nullable(),
  competition: invitedCompetitionSchema.omit({ status: true, organizationName: true }),
});
export type MyEntryInvitationDto = z.infer<typeof myEntryInvitationSchema>;

export const listMyEntryInvitationsResponseSchema = z.object({
  invitations: z.array(myEntryInvitationSchema),
});
export type ListMyEntryInvitationsResponse = z.infer<typeof listMyEntryInvitationsResponseSchema>;
