import {
  GetPublicCalendarUseCase,
  GetPublicCompetitionUseCase,
  GetPublicStandingsUseCase,
} from "@futrob/public-portal";
import type { CompetitionDiscoveryReader } from "@futrob/competitions";
import type { OfficialResultReaderPort } from "@futrob/results";
import type { FixturePlanRepository } from "@futrob/scheduling";
import type { ClockPort } from "@futrob/shared-kernel";
import type { CompetitionStandingSnapshotRepository } from "@futrob/statistics";
import type { TeamRepository } from "@futrob/teams";
import {
  DiscoveryPublishedCompetitionReader,
  SchedulingPublicCalendarReader,
  StatisticsPublicStandingsReader,
  TeamsPublicTeamDirectory,
} from "@/adapters/public-portal/readers.ts";

export function createPublicPortalModule(input: {
  readonly clock: ClockPort;
  readonly discovery: CompetitionDiscoveryReader;
  readonly standings: CompetitionStandingSnapshotRepository;
  readonly fixturePlans: Pick<FixturePlanRepository, "listActive">;
  readonly officialResults: Pick<OfficialResultReaderPort, "listByCompetition">;
  readonly teams: Pick<TeamRepository, "findById">;
}) {
  const competitions = new DiscoveryPublishedCompetitionReader(input.discovery);
  const teams = new TeamsPublicTeamDirectory(input.teams);
  return {
    getCompetition: new GetPublicCompetitionUseCase(competitions),
    getStandings: new GetPublicStandingsUseCase({
      competitions,
      standings: new StatisticsPublicStandingsReader(input.standings),
      teams,
    }),
    getCalendar: new GetPublicCalendarUseCase({
      competitions,
      calendar: new SchedulingPublicCalendarReader(input.fixturePlans, input.officialResults),
      teams,
      clock: input.clock,
    }),
  };
}

export type PublicPortalModule = ReturnType<typeof createPublicPortalModule>;
