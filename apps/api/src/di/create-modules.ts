import type { AppModules } from "./app-modules.ts";
export type { AppModules } from "./app-modules.ts";
import { RunScheduleChangeExpiry } from "@/application/scheduling/run-schedule-change-expiry.ts";
import { CachedGameDataProviderAdapter } from "@/adapters/game-data/resilience/cached-game-data-provider.adapter.ts";
import { EaClubsGameDataAdapter, ManualGameDataAdapter } from "@/adapters/game-data/internal.ts";
import {
  RepositoryProviderMatchReader,
  SchedulingEncounterReader,
  RosterTeamRepresentationReader,
} from "@/adapters/results/bridges.ts";
import { createTransactionPort } from "@/adapters/persistence/pg-transaction.ts";
import {
  CompetitionRosterEntryGate,
  DeferredRosterEntryGate,
} from "@/adapters/teams/roster-entry-gate.port.ts";
import { NoopEventPublisher } from "@/adapters/events/noop-event-publisher.ts";
import { InMemoryCompetitionRepository } from "@/adapters/competitions/in-memory.repository.ts";
import { PostgresCompetitionRepository } from "@/adapters/competitions/postgres.repository.ts";
import { CryptoIdGenerator, SystemClock } from "@/adapters/organizations/crypto-ports.ts";
import type { ProviderMatchRepository } from "@futrob/game-data";
import type { ClockPort, CompetitionId, OrganizationId } from "@futrob/shared-kernel";
import {
  InMemoryOfficialMatchSelectionRepository,
  InMemoryOfficialResultRepository,
  PostgresOfficialMatchSelectionRepository,
  PostgresOfficialResultRepository,
} from "@/adapters/results/official-result.repository.ts";
import type { Pool } from "pg";
import { createGameDataModule } from "./game-data.module.ts";
import { createGameDataPersistence } from "./game-data-persistence.composition.ts";
import { createIdentityModule } from "./identity.module.ts";
import { createOrganizationMemberDirectory } from "./organization-members.composition.ts";
import { createOrganizationsModule } from "./organizations.module.ts";
import { createEntryInvitations } from "./entry-invitations.composition.ts";
import { createCompetitionsModule } from "./competitions.module.ts";
import { createTeamsModule } from "./teams.module.ts";
import { CompetitionApplicationFlow } from "@/application/competitions/competition-application.flow.ts";
import { createAuthorizationModule } from "./authorization.module.ts";
import { DeferredAuthorizationPort } from "./deferred-authorization.port.ts";
import { CompetitionFixtureSourceAdapter } from "@/adapters/scheduling/competition-fixture-source.ts";
import {
  InMemoryEncounterMutationLock,
  PostgresEncounterMutationLock,
} from "@/adapters/scheduling/encounter-mutation-lock.ts";
import { createSchedulingModule } from "./scheduling.module.ts";
import {
  createOfficialSelectionCommands,
  createVoidOfficialResultAndUnproject,
} from "./official-selection.commands.ts";
import { createResultsModule } from "./results.module.ts";
import { createActivityFeed } from "./notifications.module.ts";
import { createStatisticsModule } from "./statistics.module.ts";
import { createPublicPortalModule } from "./public-portal.module.ts";
import { createEncounterReads } from "./encounter-reads.composition.ts";
import {
  GetTeamRosterManagementUseCase,
  ListTeamRosterManagementUseCase,
} from "@/application/teams/team-roster-management.use-case.ts";
import { RunConfirmationExpiry } from "@/application/results/run-confirmation-expiry.ts";
import { RecalculateRescheduledCandidates } from "@/application/results/recalculate-rescheduled-candidates.ts";
import { ListCompetitionDisputesQuery } from "@/application/results/list-competition-disputes.query.ts";
import { findProvisionedSystemActor } from "@/adapters/identity/configured-system-actor.ts";
import { AssociateSyncedProviderMatches } from "@/application/game-data/associate-synced-provider-matches.ts";

/**
 * Composition root for apps/api — the only place that wires adapters to use
 * cases. Organizations use Postgres when a pool is provided; otherwise memory.
 */
export interface CreateModulesInput {
  readonly fetcher: typeof fetch;
  readonly eaClubsBaseUrl: string;
  readonly pool: Pool | undefined;
  /** Test seam: observations the results module reads candidates from. */
  readonly providerMatches?: ProviderMatchRepository;
  readonly clock?: ClockPort;
  readonly resultsSystemActorId?: string;
  readonly schedulingSystemActorId?: string;
}

export function createModules(input: CreateModulesInput): AppModules {
  const ids = new CryptoIdGenerator();
  const clock = input.clock ?? new SystemClock();
  const transaction = createTransactionPort(input.pool);
  const {
    providerMatches,
    rawObservations,
    providerSyncJobs,
    providerCircuit,
    providerCache,
    providerHealth,
  } = createGameDataPersistence(input.pool, clock, input.providerMatches);
  const eaAdapter = new EaClubsGameDataAdapter({
    fetcher: input.fetcher,
    baseUrl: input.eaClubsBaseUrl,
    timeoutMs: 10_000,
    circuit: providerCircuit,
    clock,
    health: providerHealth,
  });
  const eaProvider = new CachedGameDataProviderAdapter(eaAdapter, {
    cache: providerCache,
    clock,
    ids,
    sleep: (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)),
    searchTtlMs: 30_000,
    clubTtlMs: 300_000,
    staleMs: 300_000,
  });

  const deferredAuthorization = new DeferredAuthorizationPort();
  const entryGate = new DeferredRosterEntryGate();
  const eventPublisher = new NoopEventPublisher();
  const encounterMutationLock = input.pool
    ? new PostgresEncounterMutationLock(input.pool)
    : new InMemoryEncounterMutationLock();
  const organizations = createOrganizationsModule({
    pool: input.pool,
    authorization: deferredAuthorization,
  });
  const identity = createIdentityModule({
    pool: input.pool,
  });

  const competitionRepository = input.pool
    ? new PostgresCompetitionRepository(input.pool)
    : new InMemoryCompetitionRepository();
  const officialResults = input.pool
    ? new PostgresOfficialResultRepository(input.pool)
    : new InMemoryOfficialResultRepository();
  const officialSelections = input.pool
    ? new PostgresOfficialMatchSelectionRepository(input.pool)
    : new InMemoryOfficialMatchSelectionRepository();

  const teams = createTeamsModule({
    pool: input.pool,
    competitions: competitionRepository,
    authorization: deferredAuthorization,
    transaction,
    entryGate,
  });
  const competitions = createCompetitionsModule({
    pool: input.pool,
    competitions: competitionRepository,
    authorization: deferredAuthorization,
    organizationMemberships: organizations.repositories.memberships,
    audit: organizations.repositories.audit,
    transaction,
    mutationLock: organizations.repositories.mutationLock,
    organizations: organizations.repositories.organizations,
  });
  const scheduling = createSchedulingModule({
    clock,
    pool: input.pool,
    authorization: deferredAuthorization,
    eventPublisher,
    transaction,
    officialResults,
    officialSelections,
    encounterMutationLock,
    competitions: competitionRepository,
    fixtureSource: new CompetitionFixtureSourceAdapter({
      competitions: competitionRepository,
      entries: competitions.entryRepository,
    }),
    participants: {
      async isApprovedParticipant({ organizationId, competitionId, teamId }) {
        const [team, entry] = await Promise.all([
          teams.repositories.teams.findById(organizationId, teamId),
          competitions.entryRepository.findByCompetitionAndTeam(
            organizationId,
            competitionId,
            teamId,
          ),
        ]);
        return Boolean(team && entry?.status === "approved");
      },
    },
  });
  const authorization = createAuthorizationModule({
    organizations,
    competitions,
    teams,
    transaction,
    scheduling,
  });
  deferredAuthorization.bind(authorization.port);
  entryGate.bind(new CompetitionRosterEntryGate(competitions.entryRepository));

  const teamManagementDeps = {
    authorization: deferredAuthorization,
    entries: {
      list: (organizationId: OrganizationId, competitionId: CompetitionId) =>
        competitions.entryRepository.listByCompetition?.(organizationId, competitionId) ??
        Promise.resolve([]),
      find: competitions.entryRepository.findByCompetitionAndTeam.bind(
        competitions.entryRepository,
      ),
    },
    teams: { find: teams.repositories.teams.findById.bind(teams.repositories.teams) },
    rosters: { list: teams.repositories.rosters.listByTeam.bind(teams.repositories.rosters) },
    rosterStates: {
      get: teams.repositories.rosterStates.get.bind(teams.repositories.rosterStates),
    },
    externalClubs: {
      get: teams.repositories.connections.findByTeam.bind(teams.repositories.connections),
    },
    capacity: teams.repositories.capacity,
    accounts: teams.repositories.accounts,
  };
  const teamManagement = {
    list: new ListTeamRosterManagementUseCase(teamManagementDeps),
    get: new GetTeamRosterManagementUseCase(teamManagementDeps),
  };

  const encounterReader = new SchedulingEncounterReader(
    scheduling.encounters,
    scheduling.officialMatches,
    teams.externalClubConnections,
  );
  const results = createResultsModule({
    pool: input.pool,
    authorization: deferredAuthorization,
    eventPublisher,
    encounterReader,
    providerMatches: new RepositoryProviderMatchReader(
      providerMatches,
      teams.externalClubConnections,
    ),
    teamRepresentation: new RosterTeamRepresentationReader({
      profiles: teams.repositories.profiles,
      rosters: teams.repositories.rosters,
      entries: competitions.entryRepository,
    }),
    results: officialResults,
    selections: officialSelections,
    clock,
    ids,
  });
  const gameData = createGameDataModule({
    providers: [eaProvider, new ManualGameDataAdapter()],
    ingestion: eaProvider,
    providerMatches,
    rawObservations,
    jobs: providerSyncJobs,
    completion: new AssociateSyncedProviderMatches({
      externalClubTeams: teams.externalClubTeams,
      encounterWindow: scheduling.encounterWindow,
      associateEncounterCandidates: results.associateEncounterCandidates,
    }),
    ids,
    clock,
    maxJobAttempts: 4,
    transaction,
    health: providerHealth,
  });
  const statistics = createStatisticsModule({
    pool: input.pool ?? null,
    resultReader: results.officialResultReader,
    accounts: teams.repositories.accounts,
    rosters: teams.repositories.rosters,
    profiles: teams.repositories.profiles,
    competitions: competitions.repository,
    entries: competitions.entryRepository,
    authorization: authorization.port,
    encounterReader,
    transaction,
    eventPublisher,
  });

  const publicPortal = createPublicPortalModule({
    clock,
    discovery: competitions.discovery,
    standings: statistics.ports.standings,
    fixturePlans: scheduling.fixturePlans,
    officialResults: results.officialResultReader,
    teams: teams.repositories.teams,
  });

  const activityFeed = createActivityFeed({
    pool: input.pool,
    clock,
    ids,
    transaction,
    encounterReader,
    competitions,
    teams,
    scheduling,
  });
  const officialSelection = createOfficialSelectionCommands({
    results,
    statistics,
    transaction,
    encounterLock: encounterMutationLock,
    encounterReader,
    clock,
    activity: activityFeed.selection,
  });

  const {
    getMyNextEncounter,
    getEncounterView,
    listCompetitionEncounters,
    getCurrentCompetitionFixture,
  } = createEncounterReads({
    authorization: deferredAuthorization,
    clock,
    competitions,
    teams,
    gameData,
    scheduling,
    results,
  });

  const listCompetitionDisputes = new ListCompetitionDisputesQuery({
    disputes: results.listCompetitionDisputes,
    competitions: competitions.repository,
    teams: teams.repositories.teams,
  });

  const voidOfficialResultAndUnproject = createVoidOfficialResultAndUnproject({
    results,
    statistics,
    transaction,
    encounterLock: encounterMutationLock,
  });

  const competitionApplications = new CompetitionApplicationFlow({
    transaction,
    getDiscoverable: competitions.getDiscoverable,
    apply: competitions.applyToCompetition,
    createApplicantTeam: teams.createApplicantTeam,
    claimCaptaincy: teams.claimApplicantCaptaincy,
    entries: competitions.entryRepository,
    teams: teams.repositories.teams,
    profiles: teams.repositories.profiles,
    rosters: teams.repositories.rosters,
    activity: activityFeed.entries,
  });

  const entryInvitations = createEntryInvitations({
    transaction,
    writer: activityFeed.notifications.writer,
    entryActivity: activityFeed.entries,
    competitions,
    teams,
    organizations: organizations.repositories.organizations,
  });

  const listOrganizationMembers = createOrganizationMemberDirectory({
    authorization: deferredAuthorization,
    organizations,
    identity,
    competitions,
    teams,
  });

  return {
    activityCommands: activityFeed.commands,
    authorization,
    competitionApplications,
    competitions,
    entryInvitations,
    officialSelection,
    runScheduleChangeExpiry: new RunScheduleChangeExpiry({
      feed: scheduling.scheduleChangeExpiryFeed,
      expire: activityFeed.commands.expireScheduleChangeProposal,
      clock,
      resolveSystemActor: () =>
        findProvisionedSystemActor(input.pool, input.schedulingSystemActorId),
    }),
    runConfirmationExpiry: new RunConfirmationExpiry({
      selections: results.selections,
      expire: officialSelection.expire,
      clock,
      resolveSystemActor: () => findProvisionedSystemActor(input.pool, input.resultsSystemActorId),
    }),
    recalculateRescheduledCandidates: new RecalculateRescheduledCandidates({
      feed: scheduling.scheduleChangeApplications,
      recalculate: results.recalculateEncounterCandidates,
      clock,
    }),
    gameData,
    getMyNextEncounter,
    getEncounterView,
    listCompetitionEncounters,
    getCurrentCompetitionFixture,
    listCompetitionDisputes,
    identity,
    notifications: activityFeed.notifications,
    organizations: {
      ...organizations,
      listOrganizationMembers,
    },
    publicPortal,
    results,
    scheduling,
    statistics,
    teams,
    teamManagement,
    transaction,
    voidOfficialResultAndUnproject,
  };
}
