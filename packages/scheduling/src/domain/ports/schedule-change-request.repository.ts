import type { EncounterId, OrganizationId } from "@futrob/shared-kernel";
import type { ScheduleChangeRequest } from "../entities/schedule-change-request.ts";

export interface ScheduleChangeRequestRepository {
  findByIdempotencyKey(
    organizationId: OrganizationId,
    idempotencyKey: string,
  ): Promise<ScheduleChangeRequest | null>;
  listActiveByEncounter(
    organizationId: OrganizationId,
    encounterId: EncounterId,
  ): Promise<readonly ScheduleChangeRequest[]>;
  save(request: ScheduleChangeRequest): Promise<ScheduleChangeRequest>;
}
