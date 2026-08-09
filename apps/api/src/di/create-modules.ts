import { InMemoryProviderMatchRepository } from "@/adapters/persistence/in-memory-provider-match.repository.ts";
import { createTransactionPort } from "@/adapters/persistence/pg-transaction.ts";
import { InMemoryCompetitionRepository } from "@/adapters/competitions/in-memory.repository.ts";
import { PostgresCompetitionRepository } from "@/adapters/competitions/postgres.repository.ts";
import type { TransactionPort } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { createGameDataModule, type GameDataModule } from "./game-data.module.ts";
import { createIdentityModule, type IdentityModule } from "./identity.module.ts";
import { createOrganizationsModule, type OrganizationsModule } from "./organizations.module.ts";
import { createCompetitionsModule, type CompetitionsModule } from "./competitions.module.ts";
import { createTeamsModule, type TeamsModule } from "./teams.module.ts";
import { createAuthorizationModule, type AuthorizationModule } from "./authorization.module.ts";
import { DeferredAuthorizationPort } from "./deferred-authorization.port.ts";
import { createSchedulingModule, type SchedulingModule } from "./scheduling.module.ts";

/**
 * Composition root for apps/api — the only place that wires adapters to use
 * cases. Organizations use Postgres when a pool is provided; otherwise memory.
 */
export interface CreateModulesInput {
  readonly fetcher: typeof fetch;
  readonly eaClubsBaseUrl: string;
  readonly pool: Pool | undefined;
}

export function createModules(input: CreateModulesInput): AppModules {
  const gameData = createGameDataModule({
    fetcher: input.fetcher,
    eaClubsBaseUrl: input.eaClubsBaseUrl,
    providerMatches: new InMemoryProviderMatchRepository(),
    enableManualProvider: true,
  });

  const deferredAuthorization = new DeferredAuthorizationPort();
  const transaction = createTransactionPort(input.pool);
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

  const teams = createTeamsModule({
    pool: input.pool,
    competitions: competitionRepository,
    authorization: deferredAuthorization,
  });
  const competitions = createCompetitionsModule({
    pool: input.pool,
    competitions: competitionRepository,
    authorization: deferredAuthorization,
    organizationMemberships: organizations.repositories.memberships,
    audit: organizations.repositories.audit,
    transaction,
    mutationLock: organizations.repositories.mutationLock,
  });
  const scheduling = createSchedulingModule({
    pool: input.pool,
    authorization: deferredAuthorization,
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

  return {
    authorization,
    competitions,
    gameData,
    identity,
    organizations,
    scheduling,
    teams,
    transaction,
  };
}

export interface AppModules {
  readonly authorization: AuthorizationModule;
  readonly competitions: CompetitionsModule;
  readonly gameData: GameDataModule;
  readonly identity: IdentityModule;
  readonly organizations: OrganizationsModule;
  readonly scheduling: SchedulingModule;
  readonly teams: TeamsModule;
  readonly transaction: TransactionPort;
}
