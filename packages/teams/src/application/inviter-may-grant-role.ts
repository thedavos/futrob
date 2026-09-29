import type { AuthorizationPort } from "@futrob/shared-kernel";
import type { RosterInvitation } from "../domain/entities/roster-invitation.ts";
import { permissionToGrantRosterRole } from "../domain/policies/team-permissions.ts";

/**
 * Whether the person who issued the invitation may still hand out its role.
 * Only roles above player are re-checked. Checked when the invitation is redeemed, so links issued before this rule existed, or by
 * someone who lost the role since, cannot promote anyone.
 */
export async function inviterMayGrantRole(
  authorization: AuthorizationPort,
  invitation: RosterInvitation,
): Promise<boolean> {
  // Plain player invitations were always allowed with invitation rights alone.
  if (invitation.role === "player") return true;
  // Links for roles above player are single use; older multi-use ones are refused.
  if (invitation.redeemPolicy === "multi") return false;
  const decision = await authorization.decide({
    actorId: invitation.invitedByActorId,
    permission: permissionToGrantRosterRole(invitation.role),
    scope: {
      organizationId: invitation.organizationId,
      competitionId: invitation.competitionId,
      teamId: invitation.teamId,
    },
  });
  return decision.allowed;
}
