import type { ActorId, CompetitionId, OrganizationId } from "@futrob/shared-kernel";

/** Who a row is for. `organization` rows are read by operators of that organization. */
export const ACTIVITY_AUDIENCE = {
  organization: "organization",
  team: "team",
  actor: "actor",
} as const;

export type ActivityAudience = (typeof ACTIVITY_AUDIENCE)[keyof typeof ACTIVITY_AUDIENCE];

export const ACTIVITY_KIND = {
  matchDispute: "match_dispute",
  selectionConfirmation: "selection_confirmation",
  rosterInvitation: "roster_invitation",
  competitionPublished: "competition_published",
} as const;

export type ActivityKind = (typeof ACTIVITY_KIND)[keyof typeof ACTIVITY_KIND];

export const ACTIVITY_STATUS = { open: "open", closed: "closed" } as const;

export type ActivityStatus = (typeof ACTIVITY_STATUS)[keyof typeof ACTIVITY_STATUS];

/** Aggregate that produced the fact. Together with the audience it makes a row unique. */
export const ACTIVITY_SOURCE = {
  matchDispute: "match_dispute",
  proposal: "proposal",
  rosterInvitation: "roster_invitation",
  competition: "competition",
} as const;

export type ActivitySourceName = (typeof ACTIVITY_SOURCE)[keyof typeof ACTIVITY_SOURCE];

/** Where a click on the row leads. */
export const ACTIVITY_RESOURCE = {
  encounter: "encounter",
  rosterInvitation: "roster_invitation",
  competition: "competition",
} as const;

export type ActivityResourceType = (typeof ACTIVITY_RESOURCE)[keyof typeof ACTIVITY_RESOURCE];

export interface ActivitySource {
  readonly name: ActivitySourceName;
  readonly id: string;
}

export interface ActivityAudienceRef {
  readonly audience: ActivityAudience;
  readonly audienceId: string;
}

/**
 * Display snapshot taken when the fact happened. It names things; it never carries
 * free-text reasons, which stay redacted in their owning audit trail.
 */
export interface ActivitySubject {
  readonly competitionName: string | null;
  readonly encounterLabel: string | null;
  readonly teamName: string | null;
}

/** One fact for one audience. Closing keeps the first `closedAt`. */
export interface ActivityEntry {
  readonly id: string;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId | null;
  readonly audience: ActivityAudience;
  readonly audienceId: string;
  readonly kind: ActivityKind;
  readonly status: ActivityStatus;
  /** The audience must act. Pending lists show open rows with this flag. */
  readonly requiresAction: boolean;
  readonly resourceType: ActivityResourceType;
  readonly resourceId: string;
  readonly subject: ActivitySubject;
  readonly actorId: ActorId;
  readonly closedByActorId: ActorId | null;
  readonly openedAt: Date;
  readonly closedAt: Date | null;
  /** An open row past this instant no longer counts as pending. */
  readonly expiresAt: Date | null;
  /** `closedAt ?? openedAt`; orders every feed. */
  readonly lastEventAt: Date;
  readonly sourceName: ActivitySourceName;
  readonly sourceId: string;
}

export function isPending(entry: ActivityEntry, now: Date): boolean {
  return (
    entry.status === ACTIVITY_STATUS.open &&
    entry.requiresAction &&
    (entry.expiresAt === null || entry.expiresAt.getTime() > now.getTime())
  );
}
