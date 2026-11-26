import type { CompetitionId, OrganizationId, TeamId } from "@futrob/shared-kernel";
import { RosterEntryInactive } from "../domain/errors/team.errors.ts";
import type { RosterEntryGatePort } from "../domain/ports/roster-entry-gate.port.ts";

/**
 * Every roster write (membership, invitation, role, open/close) needs a live
 * `CompetitionEntry`: `pending` or `approved`. A rejected entry is terminal (ADR-0019).
 */
export async function rosterEntryInactiveError(
  entryGate: RosterEntryGatePort,
  scope: {
    readonly organizationId: OrganizationId;
    readonly competitionId: CompetitionId;
    readonly teamId: TeamId;
  },
): Promise<RosterEntryInactive | null> {
  if (await entryGate.canMutateRoster(scope.organizationId, scope.competitionId, scope.teamId)) {
    return null;
  }
  return new RosterEntryInactive({
    code: "teams.roster_entry_inactive",
    message: "Roster writes are closed for this competition entry",
  });
}
