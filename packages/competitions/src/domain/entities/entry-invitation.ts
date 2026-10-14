import type { ActorId, CompetitionId, OrganizationId } from "@futrob/shared-kernel";

export const ENTRY_INVITATION_CHANNEL = {
  directed: "directed",
  link: "link",
} as const;

export type EntryInvitationChannel =
  (typeof ENTRY_INVITATION_CHANNEL)[keyof typeof ENTRY_INVITATION_CHANNEL];

export const ENTRY_INVITATION_STATUS = {
  pending: "pending",
  accepted: "accepted",
  declined: "declined",
  revoked: "revoked",
} as const;

export type EntryInvitationStatus =
  (typeof ENTRY_INVITATION_STATUS)[keyof typeof ENTRY_INVITATION_STATUS];

export const ENTRY_INVITATION_MESSAGE_MAX_LENGTH = 280;
export const DIRECTED_ENTRY_INVITATION_TTL_DAYS = 14;

/**
 * An organizer's invitation for a team to enter a competition. Accepting it creates the
 * Team, its approved CompetitionEntry and the captaincy (ADR-0023).
 *
 * `directed` targets one actor and closes once answered. `link` is the competition's
 * shareable link: it stays `pending` while active and admits many teams.
 */
export interface EntryInvitation {
  readonly id: string;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly channel: EntryInvitationChannel;
  /** Recipient of a `directed` invitation; null for a link. */
  readonly inviteeActorId: ActorId | null;
  /** Gamertag the organizer picked, as shown when invited. */
  readonly inviteeLabel: string | null;
  /** Shareable code of a `link`; null for a directed invitation. */
  readonly code: string | null;
  readonly message: string | null;
  readonly status: EntryInvitationStatus;
  readonly invitedByActorId: ActorId;
  readonly createdAt: Date;
  /** Directed invitations expire; a link lasts while it is active. */
  readonly expiresAt: Date | null;
  readonly respondedAt: Date | null;
  readonly acceptedEntryId: string | null;
}
