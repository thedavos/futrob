import {
  GetPublicBracketUseCase,
  GetPublicCalendarUseCase,
  GetPublicCompetitionUseCase,
  GetPublicRankingsUseCase,
  GetPublicRulesUseCase,
  GetPublicStandingsUseCase,
  GetPublicTeamsUseCase,
} from "@futrob/public-portal";
import type {
  CompetitionDiscoveryReader,
  CompetitionEntryRepository,
  CompetitionRepository,
} from "@futrob/competitions";
import type { OrganizationRepository } from "@futrob/organizations";
import type { OfficialResultReaderPort } from "@futrob/results";
import type { FixturePlanRepository } from "@futrob/scheduling";
import type { ClockPort } from "@futrob/shared-kernel";
import type {
  CompetitionStandingSnapshotRepository,
  CompetitionSwissStandingReaderPort,
  RankingSnapshotRepository,
} from "@futrob/statistics";
import type {
  CompetitionRosterMembershipRepository,
  PlayerGameAccountRepository,
  TeamRepository,
} from "@futrob/teams";
import {
  CompetitionsPublicRulesReader,
  OrganizationScopedPublishedCompetitionReader,
  RosterPublicPlayerDirectory,
  SchedulingPublicBracketReader,
  SchedulingPublicCalendarReader,
  StatisticsPublicRankingsReader,
  StatisticsPublicStandingsReader,
  TeamsPublicTeamDirectory,
} from "@/adapters/public-portal/readers.ts";

export function createPublicPortalModule(input: {
  readonly clock: ClockPort;
  readonly organizations: Pick<OrganizationRepository, "getBySlug">;
  readonly discovery: CompetitionDiscoveryReader;
  readonly competitions: Pick<CompetitionRepository, "findById">;
  readonly entries: Pick<CompetitionEntryRepository, "listByCompetition">;
  readonly standings: CompetitionStandingSnapshotRepository;
  readonly swissStandings: CompetitionSwissStandingReaderPort;
  readonly rankings: Pick<RankingSnapshotRepository, "findByCompetitionAndKind">;
  readonly fixturePlans: Pick<FixturePlanRepository, "listActive">;
  readonly officialResults: Pick<OfficialResultReaderPort, "listByCompetition">;
  readonly teams: Pick<TeamRepository, "findById">;
  readonly rosters: Pick<
    CompetitionRosterMembershipRepository,
    "findByTeamPlayerCompetition" | "findByPlayerAndCompetition"
  >;
  readonly accounts: Pick<PlayerGameAccountRepository, "findById">;
}) {
  const competitions = new OrganizationScopedPublishedCompetitionReader(
    input.organizations,
    input.discovery,
  );
  const teams = new TeamsPublicTeamDirectory(input.teams, input.entries);
  return {
    getCompetition: new GetPublicCompetitionUseCase(competitions),
    getStandings: new GetPublicStandingsUseCase({
      competitions,
      standings: new StatisticsPublicStandingsReader(input.standings, input.swissStandings),
      teams,
    }),
    getCalendar: new GetPublicCalendarUseCase({
      competitions,
      calendar: new SchedulingPublicCalendarReader(input.fixturePlans, input.officialResults),
      teams,
      clock: input.clock,
    }),
    getTeams: new GetPublicTeamsUseCase({ competitions, teams }),
    getRules: new GetPublicRulesUseCase({
      competitions,
      rules: new CompetitionsPublicRulesReader(input.competitions),
    }),
    getBracket: new GetPublicBracketUseCase({
      competitions,
      bracket: new SchedulingPublicBracketReader(input.fixturePlans, input.officialResults),
      teams,
      clock: input.clock,
    }),
    getRankings: new GetPublicRankingsUseCase({
      competitions,
      rankings: new StatisticsPublicRankingsReader(input.rankings),
      players: new RosterPublicPlayerDirectory(input.rosters, input.accounts),
      teams,
    }),
  };
}

export type PublicPortalModule = ReturnType<typeof createPublicPortalModule>;
