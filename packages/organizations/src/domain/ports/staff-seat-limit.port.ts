import type { OrganizationId } from "@futrob/shared-kernel";

/**
 * Staff seats the organization's plan allows (ADR-0025). Organizers and staff both
 * occupy a seat; `null` means unlimited. Implemented by the deployable.
 */
export interface StaffSeatLimitPort {
  staffSeatLimit(organizationId: OrganizationId): Promise<number | null>;
}
