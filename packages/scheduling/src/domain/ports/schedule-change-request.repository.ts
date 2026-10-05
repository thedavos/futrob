import type { ActorId, EncounterId, OrganizationId } from "@futrob/shared-kernel";
import type { ScheduleChangeCommandReceipt } from "../entities/schedule-change-command-receipt.ts";
import type {
  ScheduleChangeRequest,
  ScheduleChangeTransition,
} from "../entities/schedule-change-request.ts";

export type ScheduleChangeCommitOutcome =
  | { readonly kind: "committed" }
  | { readonly kind: "version_conflict"; readonly currentVersion: number };

export interface ScheduleChangeRequestRepository {
  findById(
    organizationId: OrganizationId,
    requestId: string,
  ): Promise<ScheduleChangeRequest | null>;
  findByIdempotencyKey(
    organizationId: OrganizationId,
    idempotencyKey: string,
  ): Promise<ScheduleChangeRequest | null>;
  listActiveByEncounter(
    organizationId: OrganizationId,
    encounterId: EncounterId,
  ): Promise<readonly ScheduleChangeRequest[]>;
  listByEncounter(
    organizationId: OrganizationId,
    encounterId: EncounterId,
  ): Promise<readonly ScheduleChangeRequest[]>;
  findCommandReceipt(
    organizationId: OrganizationId,
    actorId: ActorId,
    commandKey: string,
  ): Promise<ScheduleChangeCommandReceipt | null>;
  /** Persists a new request with its initial proposal. Never rewrites proposals. */
  save(request: ScheduleChangeRequest): Promise<ScheduleChangeRequest>;
  /**
   * Appends a negotiation transition and its receipt in one unit, only if the
   * stored version still equals `transition.expectedVersion`.
   */
  commit(
    transition: ScheduleChangeTransition,
    receipt: ScheduleChangeCommandReceipt,
  ): Promise<ScheduleChangeCommitOutcome>;
}
