import type { Permission } from "@futrob/shared-kernel";
import type { CompetitionMembershipRole } from "../entities/competition-membership.ts";

export const COMPETITION_PERMISSION = {
  read: "competitions.read",
  update: "competitions.update",
  publish: "competitions.publish",
  participantsRead: "competitions.participants.read",
  participantsManage: "competitions.participants.manage",
  invitationsManage: "competitions.invitations.manage",
  membershipsManage: "competitions.memberships.manage",
} as const satisfies Record<string, Permission>;

export const COMPETITION_PERMISSIONS = Object.values(COMPETITION_PERMISSION);

export const COMPETITION_ROLE_PERMISSIONS = {
  staff: COMPETITION_PERMISSIONS,
  captain: [COMPETITION_PERMISSION.read, COMPETITION_PERMISSION.participantsRead],
  player: [COMPETITION_PERMISSION.read, COMPETITION_PERMISSION.participantsRead],
} as const satisfies Record<CompetitionMembershipRole, readonly Permission[]>;
