import type { MembershipSummary, Organization } from "@futrob/organizations";

export function organizationProfileDto(organization: Organization) {
  return {
    organizationId: organization.id,
    name: organization.name,
    slug: organization.slug,
    timeZone: organization.timeZone,
    logo: organization.logo,
  };
}

export function membershipDto(membership: MembershipSummary) {
  return {
    organizationId: membership.organizationId,
    organizationName: membership.organizationName,
    organizationSlug: membership.organizationSlug,
    organizationLogo: membership.organizationLogo,
    role: membership.role,
  };
}
