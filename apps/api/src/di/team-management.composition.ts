import {
  GetTeamRosterManagementUseCase,
  ListTeamRosterManagementUseCase,
} from "@/application/teams/team-roster-management.use-case.ts";
import type {
  AuthorizationBatchPort,
  AuthorizationPort,
  CompetitionId,
  OrganizationId,
} from "@futrob/shared-kernel";
import type { CompetitionsModule } from "./competitions.module.ts";
import type { TeamsModule } from "./teams.module.ts";

/** The roster management reads, which span teams and the competition entries. */
export function createTeamManagement(deps: {
  readonly authorization: AuthorizationPort & AuthorizationBatchPort;
  readonly competitions: Pick<CompetitionsModule, "entryRepository">;
  readonly teams: Pick<TeamsModule, "repositories">;
}) {
  const teamManagementDeps = {
    authorization: deps.authorization,
    entries: {
      list: (organizationId: OrganizationId, competitionId: CompetitionId) =>
        deps.competitions.entryRepository.listByCompetition?.(organizationId, competitionId) ??
        Promise.resolve([]),
      find: deps.competitions.entryRepository.findByCompetitionAndTeam.bind(
        deps.competitions.entryRepository,
      ),
    },
    teams: { find: deps.teams.repositories.teams.findById.bind(deps.teams.repositories.teams) },
    rosters: {
      list: deps.teams.repositories.rosters.listByTeam.bind(deps.teams.repositories.rosters),
    },
    rosterStates: {
      get: deps.teams.repositories.rosterStates.get.bind(deps.teams.repositories.rosterStates),
    },
    externalClubs: {
      get: deps.teams.repositories.connections.findByTeam.bind(deps.teams.repositories.connections),
    },
    capacity: deps.teams.repositories.capacity,
    accounts: deps.teams.repositories.accounts,
  };
  return {
    list: new ListTeamRosterManagementUseCase(teamManagementDeps),
    get: new GetTeamRosterManagementUseCase(teamManagementDeps),
  };
}
