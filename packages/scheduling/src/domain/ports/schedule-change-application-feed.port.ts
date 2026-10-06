import type { EncounterId, OrganizationId } from "@futrob/shared-kernel";

/** An applied schedule change as the recalculation handoff exposes it. */
export interface AppliedScheduleChange {
  readonly applicationId: string;
  readonly requestId: string;
  readonly organizationId: OrganizationId;
  readonly encounterId: EncounterId;
  readonly appliedAt: Date;
}

export interface ScheduleChangeApplicationFeedCursor {
  readonly appliedAt: Date;
  readonly applicationId: string;
}

/**
 * Durable handoff of applied schedule changes across every organization. Rows are
 * append-only; each consumer keeps its own checkpoint.
 */
export interface ScheduleChangeApplicationFeedPort {
  /** Applications ordered by `(appliedAt, applicationId)`, strictly after `after`. */
  listAppliedAfter(input: {
    readonly after: ScheduleChangeApplicationFeedCursor | null;
    readonly limit: number;
  }): Promise<readonly AppliedScheduleChange[]>;
}
