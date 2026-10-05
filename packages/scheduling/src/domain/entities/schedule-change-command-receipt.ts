import type { ActorId, OrganizationId } from "@futrob/shared-kernel";
import type { ScheduleChangeRequestStatus } from "./schedule-change-request.ts";

export type ScheduleChangeCommandType = "accept" | "reject" | "counter";

/**
 * Durable record of one negotiation command, keyed by `(organization, actor,
 * commandKey)`. A retry with the same key and fingerprint replays this outcome;
 * the same key with a different fingerprint is an idempotency conflict.
 */
export interface ScheduleChangeCommandReceipt {
  readonly id: string;
  readonly organizationId: OrganizationId;
  readonly requestId: string;
  readonly actorId: ActorId;
  readonly commandKey: string;
  readonly commandType: ScheduleChangeCommandType;
  readonly fingerprint: string;
  readonly targetProposalId: string;
  readonly resultingVersion: number;
  readonly resultingStatus: ScheduleChangeRequestStatus;
  readonly createdProposalId: string | null;
  readonly decisionId: string | null;
  readonly occurredAt: Date;
}
