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
  type RosterEntryGatePort,
  type RosterInvitationRepository,
  type RosterInvitationTokenPort,
  type RosterMutationPort,
  type TeamRepository,
} from "@futrob/teams";
import type { CompetitionRepository } from "@futrob/competitions";
import type { Pool } from "pg";
import type { AuthorizationPort, TransactionPort } from "@futrob/shared-kernel";
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
  InMemoryRosterMutationPort,
  PostgresRosterMutationPort,
} from "@/adapters/teams/roster-mutation.port.ts";
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
  readonly transaction: TransactionPort;
  readonly entryGate: RosterEntryGatePort;
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
  let rosterMutations: RosterMutationPort;
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
    rosterMutations = new PostgresRosterMutationPort(input.pool, input.transaction);
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
    rosterMutations = new InMemoryRosterMutationPort();
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
    entryGate: input.entryGate,
    accounts,
    authorization: input.authorization,
    mutations: rosterMutations,
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
      mutations: rosterMutations,
    }),
    closeRoster: new CloseRosterUseCase({
      teams,
      rosterStates,
      clock: shared.clock,
      eventPublisher,
      authorization: input.authorization,
      mutations: rosterMutations,
    }),
    openRoster: new OpenRosterUseCase({
      teams,
      rosterStates,
      authorization: input.authorization,
      mutations: rosterMutations,
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
      entryGate: input.entryGate,
      ...shared,
    }),
    acceptRosterInvitation: new AcceptRosterInvitationUseCase({
      teams,
      rosters,
      rosterStates,
      capacity,
      entryGate: input.entryGate,
      profiles,
      invitations: rosterInvitations,
      tokens: rosterInvitationTokens,
      ensurePlayerProfile,
      accounts,
      ids: shared.ids,
      clock: shared.clock,
      mutations: rosterMutations,
    }),
    externalClubConnections: connections,
    repositories: { profiles, teams, rosters, rosterStates, connections, accounts, capacity },
  };
}

export type TeamsModule = ReturnType<typeof createTeamsModule>;
