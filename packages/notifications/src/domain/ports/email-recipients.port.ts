import type { ActorId, CompetitionId, OrganizationId } from "@futrob/shared-kernel";
import type { ActivityAudience } from "../entities/activity-entry.ts";

/** The audience of a fact, as recorded in the activity feed. */
export interface EmailAudience {
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId | null;
  readonly audience: ActivityAudience;
  readonly audienceId: string;
}

/** Turns an audience into the actors who read email for it. Implemented by an app bridge. */
export interface EmailRecipientsPort {
  actorsFor(audience: EmailAudience): Promise<readonly ActorId[]>;
}

export interface EmailContact {
  readonly actorId: ActorId;
  readonly email: string;
  readonly displayName: string;
}

/** Current address of each actor; an actor without one is absent from the result. */
export interface EmailContactsPort {
  listByActorIds(actorIds: readonly ActorId[]): Promise<readonly EmailContact[]>;
}

/** Whether the organization's plan includes the email channel (ADR-0025). */
export interface EmailChannelAccessPort {
  allowsEmail(organizationId: OrganizationId): Promise<boolean>;
}
