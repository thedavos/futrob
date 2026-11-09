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
  entryInvitation: "entry_invitation",
  scheduleChange: "schedule_change",
  organizerDecision: "organizer_decision",
  competitionEntry: "competition_entry",
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
  entryInvitation: "entry_invitation",
  /** A proposal of a schedule change: the Team that must answer it, and the watching organizer. */
  scheduleChangeProposal: "schedule_change_proposal",
  /** A schedule change nobody answered in time: the organizer must decide it. */
  scheduleChangeEscalation: "schedule_change_escalation",
  organizerDecision: "organizer_decision",
  competitionEntry: "competition_entry",
} as const;

export type ActivitySourceName = (typeof ACTIVITY_SOURCE)[keyof typeof ACTIVITY_SOURCE];

/** Where a click on the row leads. */
export const ACTIVITY_RESOURCE = {
  encounter: "encounter",
  rosterInvitation: "roster_invitation",
  competition: "competition",
  entryInvitation: "entry_invitation",
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
 * An audience the reader may see, optionally only within one competition. Team authority
 * is contextual: a captain of a Team in one competition is not its captain in another.
 */
export interface ActivityAudienceScope extends ActivityAudienceRef {
  readonly competitionId?: string;
}

/** What an organizer decided, as a closed vocabulary: the reason stays in the audit trail. */
export const ACTIVITY_OUTCOME = {
  entryApproved: "entry_approved",
  entryRejected: "entry_rejected",
  scheduleSet: "schedule_set",
  scheduleKept: "schedule_kept",
  walkoverIntended: "walkover_intended",
} as const;

export type ActivityOutcome = (typeof ACTIVITY_OUTCOME)[keyof typeof ACTIVITY_OUTCOME];

/**
 * Display snapshot taken when the fact happened. It names things; it never carries
 * free-text reasons, which stay redacted in their owning audit trail.
 */
export interface ActivitySubject {
  readonly competitionName: string | null;
  readonly encounterLabel: string | null;
  readonly teamName: string | null;
  /** Set by `organizer_decision` only. */
  readonly outcome: ActivityOutcome | null;
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
