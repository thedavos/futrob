import type { OrganizationId } from "@futrob/shared-kernel";
import type { PlanRequest } from "../entities/plan-request.ts";

export interface PlanRequestRepository {
  /** At most one request per organization is pending at a time. */
  findPendingForOrganization(organizationId: OrganizationId): Promise<PlanRequest | null>;
  /** Oldest first, across organizations; platform superuser reads only. */
  listPending(limit: number): Promise<readonly PlanRequest[]>;
  /** Stores by id, replacing the previous state of the same request. */
  save(request: PlanRequest): Promise<void>;
}
