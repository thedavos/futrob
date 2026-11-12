import type {
  CompetitionEntryStatusDto,
  CompetitionTeamManagementDetailResponse,
  GetMyTeamsResponse,
  PlayerTeamMembershipDto,
  RosterMembershipRoleDto,
} from "@futrob/api-contracts";

/**
 * Pure team-space model shared by clients: which roster membership a competition's team pages
 * act for, and what those pages may offer. Presentation gates only; the API authorizes again.
 */

export interface TeamScope {
  readonly organizationId: string;
  readonly competitionId: string;
  readonly teamId: string;
}

/**
 * The actor's Team in a competition: the active roster membership when it is there, else the
 * first one (web's `membershipForCompetition`). `undefined` when the actor plays no Team there or
 * the competition belongs to another organization than the route's.
 */
export function teamMembershipForCompetition(
  teams: GetMyTeamsResponse,
  competitionId: string,
  organizationId: string | null,
): PlayerTeamMembershipDto | undefined {
  const inCompetition = teams.teams.filter(
    (item) => item.membership.competitionId === competitionId,
  );
  const chosen =
    inCompetition.find((item) => item.membership.id === teams.activeRosterMembershipId) ??
    inCompetition[0];
  if (!chosen) return undefined;
  if (organizationId !== null && chosen.membership.organizationId !== organizationId) {
    return undefined;
  }
  return chosen;
}

export function teamScopeOf(membership: PlayerTeamMembershipDto): TeamScope {
  return {
    organizationId: membership.membership.organizationId,
    competitionId: membership.membership.competitionId,
    teamId: membership.membership.teamId,
  };
}

/** The API only accepts roster changes while the entry is pending or approved. */
export function isRosterWritable(status: CompetitionEntryStatusDto): boolean {
  return status === "pending" || status === "approved";
}

const ROSTER_ROLES = ["player", "vice_captain", "captain"] as const;

/** Roles an invitation may carry: only `player` without the roster-roles permission (web). */
export function invitableRosterRoles(canManageRoles: boolean): readonly RosterMembershipRoleDto[] {
  return canManageRoles ? ROSTER_ROLES : ["player"];
}

/** Roles a member's role may change to. */
export function rosterRoles(): readonly RosterMembershipRoleDto[] {
  return ROSTER_ROLES;
}

/** Why a new roster invitation would not let anyone join now; `null` when it would. */
export type RosterInvitationBlock = "entry_closed" | "roster_closed" | "roster_full";

export function rosterInvitationBlock(
  detail: Pick<CompetitionTeamManagementDetailResponse, "entry" | "roster">,
): RosterInvitationBlock | null {
  if (!isRosterWritable(detail.entry.status)) return "entry_closed";
  if (detail.roster.state === "closed") return "roster_closed";
  if (detail.roster.memberCount >= detail.roster.maxSize) return "roster_full";
  return null;
}

/** The actor's Teams, the active one first, then by Team name. */
export function sortTeamsActiveFirst(
  teams: readonly PlayerTeamMembershipDto[],
): readonly PlayerTeamMembershipDto[] {
  return [...teams].sort(
    (a, b) => Number(b.active) - Number(a.active) || a.team.name.localeCompare(b.team.name),
  );
}

/** Link an invited person opens to join an organization (web's `/invitations/accept/:token`). */
export function buildOrganizationInvitationShareUrl(origin: string, token: string): string {
  const base = origin.endsWith("/") ? origin.slice(0, -1) : origin;
  return `${base}/invitations/accept/${encodeURIComponent(token)}`;
}
