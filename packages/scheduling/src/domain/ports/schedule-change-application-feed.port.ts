import type { EncounterId, OrganizationId } from "@futrob/shared-kernel";

/** An applied schedule change as the recalculation handoff exposes it. */
export interface AppliedScheduleChange {
  readonly applicationId: string;
  readonly requestId: string;
  readonly organizationId: OrganizationId;
  readonly encounterId: EncounterId;
  readonly appliedAt: Date;
}

/**
 * Durable handoff of applied schedule changes across every organization. Each consumer
 * acknowledges what it handled. Nothing depends on commit order: an application whose
 * transaction commits late is listed as soon as it is visible.
 */
export interface ScheduleChangeApplicationFeedPort {
  /** Applications `consumer` has not acknowledged, oldest `appliedAt` first. */
  listUnacknowledged(input: {
    readonly consumer: string;
    readonly limit: number;
  }): Promise<readonly AppliedScheduleChange[]>;
  /** Acknowledging the same application again keeps the first acknowledgement. */
  acknowledge(input: {
    readonly consumer: string;
    readonly applicationId: string;
    readonly acknowledgedAt: Date;
  }): Promise<void>;
}
