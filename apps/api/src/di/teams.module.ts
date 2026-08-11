import { randomUUID } from "node:crypto";
import {
  AddPlayerGameAccountUseCase,
  AddToRosterUseCase,
  AcceptRosterInvitationUseCase,
  AssociatePlayerExternalClubUseCase,
  ChangeRosterRoleUseCase,
  CloseRosterUseCase,
  ConnectTeamExternalClubUseCase,
  CreateRosterInvitationUseCase,
  CreateTeamUseCase,
  EnsurePlayerProfileUseCase,
  GetActiveTeamUseCase,
  GetPlayerProfileUseCase,
  GetTeamExternalClubUseCase,
  GetTeamUseCase,
  ListRosterForTeamUseCase,
  ListOrganizationTeamsUseCase,
  ListRostersForPlayerUseCase,
  LinkProviderExternalPlayerIdUseCase,
  OpenRosterUseCase,
  SetActiveTeamUseCase,
  type ActiveTeamPreferenceRepository,
  type CompetitionRosterMembershipRepository,
  type CompetitionRosterStateRepository,
  type ExternalClubConnectionRepository,
  type PlayerExternalClubAssociationRepository,
  type PlayerGameAccountRepository,
  type PlayerProfileRepository,
  type RosterCapacityPort,
  type RosterInvitationRepository,
  type RosterInvitationTokenPort,
  type TeamRepository,
} from "@futrob/teams";
import type { CompetitionRepository } from "@futrob/competitions";
import type { Pool } from "pg";
import type { AuthorizationPort } from "@futrob/shared-kernel";
import {
  InMemoryExternalClubConnectionRepository,
  PostgresExternalClubConnectionRepository,
} from "@/adapters/teams/external-club-connection.repository.ts";
import {
  CompetitionRulesRosterCapacityPort,
  InMemoryCompetitionRosterStateRepository,
  PostgresCompetitionRosterStateRepository,
} from "@/adapters/teams/roster-state.repository.ts";
import {
  InMemoryPlayerExternalClubAssociationRepository,
  InMemoryPlayerGameAccountRepository,
  InMemoryPlayerProfileRepository,
} from "@/adapters/teams/in-memory.repository.ts";
import {
  PostgresPlayerExternalClubAssociationRepository,
  PostgresPlayerGameAccountRepository,
  PostgresPlayerProfileRepository,
} from "@/adapters/teams/postgres.repository.ts";
import {
  InMemoryRosterInvitationRepository,
  PostgresRosterInvitationRepository,
} from "@/adapters/teams/roster-invitation.repository.ts";
import { Sha256RosterInvitationTokenPort } from "@/adapters/teams/roster-invitation-token.port.ts";
import {
  InMemoryActiveTeamPreferenceRepository,
  InMemoryCompetitionRosterMembershipRepository,
  InMemoryTeamRepository,
  PostgresActiveTeamPreferenceRepository,
  PostgresCompetitionRosterMembershipRepository,
  PostgresTeamRepository,
} from "@/adapters/teams/team-roster.repositories.ts";

export function createTeamsModule(input: {
  readonly pool: Pool | undefined;
  readonly competitions: CompetitionRepository;
  readonly authorization: AuthorizationPort;
}) {
  let profiles: PlayerProfileRepository;
  let accounts: PlayerGameAccountRepository;
  let associations: PlayerExternalClubAssociationRepository;
  let teams: TeamRepository;
  let rosters: CompetitionRosterMembershipRepository;
  let preferences: ActiveTeamPreferenceRepository;
  let rosterStates: CompetitionRosterStateRepository;
  let connections: ExternalClubConnectionRepository;
  let rosterInvitations: RosterInvitationRepository;
  let rosterInvitationTokens: RosterInvitationTokenPort;
  if (input.pool) {
    profiles = new PostgresPlayerProfileRepository(input.pool);
    accounts = new PostgresPlayerGameAccountRepository(input.pool);
    associations = new PostgresPlayerExternalClubAssociationRepository(input.pool);
    teams = new PostgresTeamRepository(input.pool);
    rosters = new PostgresCompetitionRosterMembershipRepository(input.pool);
    preferences = new PostgresActiveTeamPreferenceRepository(input.pool);
    rosterStates = new PostgresCompetitionRosterStateRepository(input.pool);
    connections = new PostgresExternalClubConnectionRepository(input.pool);
    rosterInvitations = new PostgresRosterInvitationRepository(input.pool);
  } else {
    profiles = new InMemoryPlayerProfileRepository();
    accounts = new InMemoryPlayerGameAccountRepository();
    associations = new InMemoryPlayerExternalClubAssociationRepository();
    teams = new InMemoryTeamRepository();
    rosters = new InMemoryCompetitionRosterMembershipRepository();
    preferences = new InMemoryActiveTeamPreferenceRepository();
    rosterStates = new InMemoryCompetitionRosterStateRepository();
    connections = new InMemoryExternalClubConnectionRepository();
    rosterInvitations = new InMemoryRosterInvitationRepository();
  }
  rosterInvitationTokens = new Sha256RosterInvitationTokenPort();
  const shared = { clock: { now: () => new Date() }, ids: { generate: () => randomUUID() } };
  const capacity: RosterCapacityPort = new CompetitionRulesRosterCapacityPort(input.competitions);
  const eventPublisher = {
    publish: async () => {},
    publishMany: async () => {},
  };
  const ensurePlayerProfile = new EnsurePlayerProfileUseCase({ profiles, ...shared });
  const addToRoster = new AddToRosterUseCase({
    teams,
    rosters,
    rosterStates,
    capacity,
    accounts,
    authorization: input.authorization,
    ...shared,
  });
  return {
    ensurePlayerProfile,
    addPlayerGameAccount: new AddPlayerGameAccountUseCase({ accounts, ...shared }),
    linkProviderExternalPlayerId: new LinkProviderExternalPlayerIdUseCase({ accounts }),
    associatePlayerExternalClub: new AssociatePlayerExternalClubUseCase({
      profiles,
      associations,
      clock: shared.clock,
    }),
    getPlayerProfile: new GetPlayerProfileUseCase(profiles, accounts, associations),
    createTeam: new CreateTeamUseCase({ teams, authorization: input.authorization, ...shared }),
    getTeam: new GetTeamUseCase(teams),
    listByOrganization: new ListOrganizationTeamsUseCase(teams),
    addToRoster,
    listRosterForTeam: new ListRosterForTeamUseCase(rosters),
    changeRosterRole: new ChangeRosterRoleUseCase({
      authorization: input.authorization,
      rosters,
    }),
    closeRoster: new CloseRosterUseCase({
      teams,
      rosterStates,
      clock: shared.clock,
      eventPublisher,
      authorization: input.authorization,
    }),
    openRoster: new OpenRosterUseCase({
      teams,
      rosterStates,
      authorization: input.authorization,
    }),
    connectTeamExternalClub: new ConnectTeamExternalClubUseCase({
      teams,
      connections,
      eventPublisher,
      authorization: input.authorization,
    }),
    getTeamExternalClub: new GetTeamExternalClubUseCase(connections),
    listRostersForPlayer: new ListRostersForPlayerUseCase(rosters),
    setActiveTeam: new SetActiveTeamUseCase({
      profiles,
      rosters,
      preferences,
      clock: shared.clock,
    }),
    getActiveTeam: new GetActiveTeamUseCase(preferences),
    createRosterInvitation: new CreateRosterInvitationUseCase({
      teams,
      invitations: rosterInvitations,
      tokens: rosterInvitationTokens,
      authorization: input.authorization,
      ...shared,
    }),
    acceptRosterInvitation: new AcceptRosterInvitationUseCase({
      teams,
      rosters,
      rosterStates,
      capacity,
      profiles,
      invitations: rosterInvitations,
      tokens: rosterInvitationTokens,
      ensurePlayerProfile,
      accounts,
      ids: shared.ids,
      clock: shared.clock,
    }),
    /** Exposed for competitions approve-entry verification bridge. */
    externalClubConnections: connections,
    repositories: { profiles, teams, rosters, accounts },
  };
}

export type TeamsModule = ReturnType<typeof createTeamsModule>;
