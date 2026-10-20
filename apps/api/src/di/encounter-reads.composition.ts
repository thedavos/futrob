import type { AuthorizationBatchPort, AuthorizationPort, ClockPort } from "@futrob/shared-kernel";
import type { EncounterSummaryDependencies } from "@/application/scheduling/encounter-summary.ts";
import { GetEncounterViewUseCase } from "@/application/scheduling/get-encounter-view.use-case.ts";
import { GetMyNextEncounterUseCase } from "@/application/scheduling/get-my-next-encounter.use-case.ts";
import { ListCompetitionEncountersUseCase } from "@/application/scheduling/list-competition-encounters.use-case.ts";
import type { CompetitionsModule } from "./competitions.module.ts";
import type { GameDataModule } from "./game-data.module.ts";
import type { ResultsModule } from "./results.module.ts";
import type { SchedulingModule } from "./scheduling.module.ts";
import type { TeamsModule } from "./teams.module.ts";

export function createEncounterReads(input: {
  readonly authorization: AuthorizationPort & AuthorizationBatchPort;
  readonly clock: ClockPort;
  readonly competitions: CompetitionsModule;
  readonly teams: TeamsModule;
  readonly gameData: GameDataModule;
  readonly scheduling: SchedulingModule;
  readonly results: ResultsModule;
}) {
  const { clock, competitions, teams, gameData, scheduling } = input;
  const encounterSummaryDeps: EncounterSummaryDependencies = {
    competitions: competitions.repository,
    teams: { findById: teams.repositories.teams.findById.bind(teams.repositories.teams) },
    connections: teams.repositories.connections,
    getExternalClub: (providerKey, request) =>
      gameData.getExternalClub.execute(providerKey, request),
    fixturePlans: scheduling.fixturePlans,
  };
  return {
    getMyNextEncounter: new GetMyNextEncounterUseCase({
      ...encounterSummaryDeps,
      clock,
      profiles: teams.repositories.profiles,
      rosters: teams.repositories.rosters,
      encounters: scheduling.encounters,
    }),
    getEncounterView: new GetEncounterViewUseCase({
      ...encounterSummaryDeps,
      officialMatches: scheduling.officialMatches,
    }),
    listCompetitionEncounters: new ListCompetitionEncountersUseCase({
      authorization: input.authorization,
      clock,
      competitions: competitions.repository,
      fixturePlans: scheduling.fixturePlans,
      teams: encounterSummaryDeps.teams,
      officialResults: input.results.officialResultReader,
    }),
  };
}
