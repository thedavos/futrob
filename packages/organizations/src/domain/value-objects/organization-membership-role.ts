export type OrgMembershipRole = "organizer" | "staff" | "member";

export type OrganizationInviteRole = "staff" | "member";
export type CompetitionInviteRole = "staff" | "captain" | "player";
export type InviteRole = OrganizationInviteRole | CompetitionInviteRole;

export function isInviteRole(role: string): role is InviteRole {
  return isOrganizationInviteRole(role) || isCompetitionInviteRole(role);
}

export function isOrganizationInviteRole(role: string): role is OrganizationInviteRole {
  return role === "staff" || role === "member";
}

export function isCompetitionInviteRole(role: string): role is CompetitionInviteRole {
  return role === "staff" || role === "captain" || role === "player";
}
