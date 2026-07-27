export type OrgMembershipRole = "organizer" | "staff" | "captain" | "player";

export type InviteRole = Exclude<OrgMembershipRole, "organizer">;

export function isInviteRole(role: string): role is InviteRole {
  return role === "staff" || role === "captain" || role === "player";
}
