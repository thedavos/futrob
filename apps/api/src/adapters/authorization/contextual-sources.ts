import type {
  CompetitionEntryRepository,
  CompetitionMembershipRepository,
  CompetitionRepository,
} from "@futrob/competitions";
import type {
  AccessGrantRepository,
  MembershipRepository,
  OrganizationRepository,
  PlatformRoleRepository,
} from "@futrob/organizations";
import type { EncounterScheduleSnapshot as EncounterAuthorizationSnapshot } from "@futrob/scheduling";
import type { ActorId, EncounterId, OrganizationId } from "@futrob/shared-kernel";
import type {
  CompetitionRosterMembershipRepository,
  PlayerProfileRepository,
  TeamRepository,
} from "@futrob/teams";

export interface EncounterAuthorizationReader {
  findById(encounterId: EncounterId): Promise<EncounterAuthorizationSnapshot | null>;
  findByIds(
    encounterIds: readonly EncounterId[],
  ): Promise<readonly EncounterAuthorizationSnapshot[]>;
}

export type AuthorizationSources = {
  readonly organizations: OrganizationRepository;
  readonly organizationMemberships: MembershipRepository;
  readonly competitionMemberships: CompetitionMembershipRepository;
  readonly competitions: CompetitionRepository;
  readonly entries: CompetitionEntryRepository;
  readonly teams: TeamRepository;
  readonly profiles: PlayerProfileRepository;
  readonly rosters: CompetitionRosterMembershipRepository;
  readonly grants: AccessGrantRepository;
  readonly platformRoles: PlatformRoleRepository;
  readonly encounters?: EncounterAuthorizationReader;
};

export type LayerSources = ReturnType<typeof layerSources>;

/**
 * The reads authorization needs, memoized for one request so scopes that share an
 * organization, competition, profile or Team entry do not repeat the same query.
 */
export function layerSources(
  deps: AuthorizationSources,
  snapshots: ReadonlyMap<EncounterId, EncounterAuthorizationSnapshot> | null,
) {
  return {
    superuser: once((actorId: ActorId) => deps.platformRoles.findSuperuser(actorId)),
    organization: once((organizationId: OrganizationId) =>
      deps.organizations.getById(organizationId),
    ),
    organizationMembership: once((organizationId: OrganizationId, actorId: ActorId) =>
      deps.organizationMemberships.findByOrgAndActor(organizationId, actorId),
    ),
    competition: once(
      (
        organizationId: OrganizationId,
        competitionId: Parameters<CompetitionRepository["findById"]>[1],
      ) => deps.competitions.findById(organizationId, competitionId),
    ),
    competitionMembership: once(
      (
        competitionId: Parameters<CompetitionMembershipRepository["findByCompetitionAndActor"]>[0],
        actorId: ActorId,
      ) => deps.competitionMemberships.findByCompetitionAndActor(competitionId, actorId),
    ),
    encounter: once(
      async (encounterId: EncounterId): Promise<EncounterAuthorizationSnapshot | null> =>
        snapshots
          ? (snapshots.get(encounterId) ?? null)
          : ((await deps.encounters?.findById(encounterId)) ?? null),
    ),
    team: once(
      (organizationId: OrganizationId, teamId: Parameters<TeamRepository["findById"]>[1]) =>
        deps.teams.findById(organizationId, teamId),
    ),
    entry: once((...args: Parameters<CompetitionEntryRepository["findByCompetitionAndTeam"]>) =>
      deps.entries.findByCompetitionAndTeam(...args),
    ),
    profile: once((actorId: ActorId) => deps.profiles.findByActor(actorId)),
    rosterOnTeam: once(
      (...args: Parameters<CompetitionRosterMembershipRepository["findByTeamPlayerCompetition"]>) =>
        deps.rosters.findByTeamPlayerCompetition(...args),
    ),
    rostersOfProfile: once(
      (...args: Parameters<CompetitionRosterMembershipRepository["listByPlayerProfile"]>) =>
        deps.rosters.listByPlayerProfile(...args),
    ),
  };
}

function once<Args extends readonly string[], Result>(
  load: (...args: Args) => Promise<Result>,
): (...args: Args) => Promise<Result> {
  const loaded = new Map<string, Promise<Result>>();
  return (...args) => {
    const key = args.join("\u0000");
    const hit = loaded.get(key);
    if (hit) return hit;
    const next = load(...args);
    loaded.set(key, next);
    return next;
  };
}
