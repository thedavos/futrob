import type { CompetitionDiscoveryReader } from "@futrob/competitions";
import type {
  PublicCalendarReaderPort,
  PublicCalendarSourceEntry,
  PublicCompetitionKey,
  PublicCompetitionScope,
  PublicCompetitionSource,
  PublicStandingsReaderPort,
  PublicStandingsSource,
  PublicTeamDirectoryPort,
  PublishedCompetitionReaderPort,
} from "@futrob/public-portal";
import type { OfficialResultReaderPort } from "@futrob/results";
import type { FixturePlanRepository } from "@futrob/scheduling";
import { asCompetitionId, type TeamId } from "@futrob/shared-kernel";
import type { CompetitionStandingSnapshotRepository } from "@futrob/statistics";
import type { TeamRepository } from "@futrob/teams";
import { pairedEncounters } from "@/application/scheduling/paired-encounters.ts";

/**
 * Today the public key IS the competition id. That identity lives only here: when the
 * product picks a slug or short code (ADR-0024), this adapter changes and nothing above it.
 */
export class DiscoveryPublishedCompetitionReader implements PublishedCompetitionReaderPort {
  constructor(private readonly discovery: Pick<CompetitionDiscoveryReader, "findById">) {}

  async findByKey(key: PublicCompetitionKey): Promise<PublicCompetitionSource | null> {
    const record = await this.discovery.findById(asCompetitionId(key));
    if (!record) return null;
    const { competition } = record;
    return {
      scope: {
        competitionId: competition.id,
        organizationId: competition.organizationId,
      },
      name: competition.name,
      status: competition.status,
      format: competition.format,
      platform: competition.platform,
      gameEdition: competition.gameEdition,
      region: competition.region,
      timeZone: competition.timeZone,
      startsOn: competition.schedule.startsOn,
      endsOn: competition.schedule.endsOn,
      cover: competition.cover,
      approvedTeamCount: record.approvedTeamCount,
    };
  }
}

export class StatisticsPublicStandingsReader implements PublicStandingsReaderPort {
  constructor(private readonly standings: CompetitionStandingSnapshotRepository) {}

  async read(scope: PublicCompetitionScope): Promise<PublicStandingsSource | null> {
    const snapshot = await this.standings.findByCompetition(scope.competitionId);
    // The snapshot is keyed by competition alone; a mismatched tenant is treated as absent.
    if (!snapshot || snapshot.organizationId !== scope.organizationId) return null;
    return {
      rows: snapshot.rows.map((row) => ({
        position: row.position,
        teamId: row.teamId,
        played: row.played,
        wins: row.wins,
        draws: row.draws,
        losses: row.losses,
        goalsFor: row.goalsFor,
        goalsAgainst: row.goalsAgainst,
        goalDifference: row.goalDifference,
        points: row.points,
      })),
      updatedAt: snapshot.updatedAt,
    };
  }
}

export class SchedulingPublicCalendarReader implements PublicCalendarReaderPort {
  constructor(
    private readonly fixturePlans: Pick<FixturePlanRepository, "listActive">,
    private readonly officialResults: Pick<OfficialResultReaderPort, "listByCompetition">,
  ) {}

  async list(scope: PublicCompetitionScope): Promise<readonly PublicCalendarSourceEntry[]> {
    const [plans, results] = await Promise.all([
      this.fixturePlans.listActive(scope.organizationId, scope.competitionId),
      this.officialResults.listByCompetition(scope.competitionId, scope.organizationId),
    ]);
    const official = new Set(
      results.filter((result) => result.status === "approved").map((result) => result.encounterId),
    );
    return plans
      .flatMap(pairedEncounters)
      .map(({ encounter, homeTeamId, awayTeamId, roundNumber }) => ({
        roundNumber,
        scheduledStartAt: encounter.scheduledStartAt,
        homeTeamId,
        awayTeamId,
        official: official.has(encounter.id),
      }));
  }
}

export class TeamsPublicTeamDirectory implements PublicTeamDirectoryPort {
  constructor(private readonly teams: Pick<TeamRepository, "findById">) {}

  async namesByIds(
    scope: PublicCompetitionScope,
    teamIds: readonly TeamId[],
  ): Promise<ReadonlyMap<TeamId, string>> {
    const unique = [...new Set(teamIds)];
    const teams = await Promise.all(
      unique.map((teamId) => this.teams.findById(scope.organizationId, teamId)),
    );
    return new Map(
      teams.flatMap((team): [TeamId, string][] => (team ? [[team.id, team.name]] : [])),
    );
  }
}
