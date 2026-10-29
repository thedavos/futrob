import type { OrganizationId } from "@futrob/shared-kernel";
import { OrganizationStaffLimitReached } from "../domain/errors/staff-seat.errors.ts";
import type { MembershipRepository } from "../domain/ports/membership.repository.ts";
import type { StaffSeatLimitPort } from "../domain/ports/staff-seat-limit.port.ts";
import type { OrgMembershipRole } from "../domain/value-objects/organization-membership-role.ts";

export function occupiesStaffSeat(role: OrgMembershipRole): boolean {
  return role === "organizer" || role === "staff";
}

/** Null when one more staff seat fits in the organization's plan. */
export async function staffSeatError(
  deps: { readonly memberships: MembershipRepository; readonly staffSeats: StaffSeatLimitPort },
  organizationId: OrganizationId,
): Promise<OrganizationStaffLimitReached | null> {
  const max = await deps.staffSeats.staffSeatLimit(organizationId);
  if (max === null) return null;
  const [organizers, staff] = await Promise.all([
    deps.memberships.countByRole(organizationId, "organizer"),
    deps.memberships.countByRole(organizationId, "staff"),
  ]);
  if (organizers + staff < max) return null;
  return new OrganizationStaffLimitReached({
    code: "organizations.staff_limit_reached",
    message: `The organization's plan allows ${max} staff members`,
    max,
  });
}
