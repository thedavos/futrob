import type { ActorId, OrganizationId } from "@futrob/shared-kernel";
import type {
  ActivityAudienceRef,
  ActivityEntry,
  ActivitySource,
  ActivityStatus,
} from "../entities/activity-entry.ts";

/** Keyset position: rows strictly after it in `lastEventAt DESC, id DESC` order. */
export interface ActivityPosition {
  readonly lastEventAt: Date;
  readonly id: string;
}

export interface ActivityQuery {
  /** Rows of any of these audiences. Never empty. */
  readonly audiences: readonly ActivityAudienceRef[];
  readonly organizationId?: OrganizationId;
  readonly status?: ActivityStatus;
  readonly requiresAction?: boolean;
  /** With `status: open`, rows whose `expiresAt` is not after `now` are left out. */
  readonly now: Date;
  readonly after?: ActivityPosition;
  readonly limit: number;
}

export interface CloseActivityCommand {
  readonly source: ActivitySource;
  /** Only this audience; every audience of the source when absent. */
  readonly audience?: ActivityAudienceRef;
  readonly closedAt: Date;
  readonly closedByActorId: ActorId | null;
}

/**
 * Only writer of activity rows. Rows are unique per source and audience: inserting an
 * existing pair keeps the stored row, and closing a closed row keeps its first close.
 */
export interface ActivityEntryRepository {
  /** Stores the rows that do not exist yet; returns the stored row for every input, in order. */
  insertIfAbsent(entries: readonly ActivityEntry[]): Promise<readonly ActivityEntry[]>;
  /** Closes open rows of the source; returns how many changed. */
  close(command: CloseActivityCommand): Promise<number>;
  /** Ordered by `lastEventAt DESC, id DESC`. */
  list(query: ActivityQuery): Promise<readonly ActivityEntry[]>;
}
