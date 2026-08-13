import type {
  ActorId,
  AuthorizationPort,
  ClockPort,
  CompetitionId,
  TeamId,
} from "@futrob/shared-kernel";
import type { PlayerCompetitionStats } from "../../domain/entities/player-competition-stats.ts";
import type { PlayerPersonalStats } from "../../domain/entities/player-personal-stats.ts";
import { StatisticsAuthorizationForbidden } from "../../domain/errors/statistics.errors.ts";
import type { PlayerCompetitionStatsRepository } from "../../domain/ports/player-competition-stats.repository.ts";
import type { PlayerMatchContributionRepository } from "../../domain/ports/player-match-contribution.repository.ts";
import type { PlayerPersonalStatsRepository } from "../../domain/ports/player-personal-stats.repository.ts";
import type { PlayerProfileLookupPort } from "../../domain/ports/player-profile-lookup.port.ts";
import { aggregatePlayerContributions } from "../../domain/policies/aggregate-player-contributions.ts";
import { STATISTICS_PERMISSION } from "../../domain/policies/statistics-permissions.ts";

export interface GetMyPersonalStatisticsInput {
  readonly actorId: ActorId;
  readonly competitionId?: CompetitionId;
  readonly teamId?: TeamId;
  readonly gameEdition?: string;
  readonly platform?: string;
  readonly position?: string;
}

export interface GetMyPersonalStatisticsDependencies {
  readonly personalStats: PlayerPersonalStatsRepository;
  readonly competitionStats: PlayerCompetitionStatsRepository;
  readonly contributions: PlayerMatchContributionRepository;
  readonly profiles: PlayerProfileLookupPort;
  readonly authorization: AuthorizationPort;
  readonly clock: ClockPort;
}

export class GetMyPersonalStatisticsUseCase {
  constructor(private readonly deps: GetMyPersonalStatisticsDependencies) {}

  async execute(input: GetMyPersonalStatisticsInput): Promise<PlayerPersonalStats | null> {
    const profile = await this.deps.profiles.findByActor(input.actorId);
    const decision = await this.deps.authorization.decide({
      actorId: input.actorId,
      permission: STATISTICS_PERMISSION.readOwn,
      scope: {},
    });
    if (!decision.allowed) {
      throw new StatisticsAuthorizationForbidden({
        code: "statistics.read_own_forbidden",
        message: "The actor cannot read personal statistics",
      });
    }
    if (!profile) return null;

    if (!hasContributionFilters(input)) {
      if (input.competitionId === undefined) {
        return this.deps.personalStats.findByPlayerProfile(profile.id);
      }
      const stats = await this.deps.competitionStats.findByPlayerAndCompetition(
        profile.id,
        input.competitionId,
      );
      return stats ? toPersonalStats(stats) : null;
    }

    const contributions = await this.deps.contributions.listMatched({
      playerProfileId: profile.id,
      ...(input.competitionId === undefined ? {} : { competitionId: input.competitionId }),
      ...(input.teamId === undefined ? {} : { teamId: input.teamId }),
      ...(input.gameEdition === undefined ? {} : { gameEdition: input.gameEdition }),
      ...(input.platform === undefined ? {} : { platform: input.platform }),
      ...(input.position === undefined ? {} : { position: input.position }),
    });
    if (contributions.length === 0) return null;
    return {
      playerProfileId: profile.id,
      ...aggregatePlayerContributions(contributions),
      updatedAt: this.deps.clock.now(),
    };
  }
}

function hasContributionFilters(input: GetMyPersonalStatisticsInput): boolean {
  return (
    input.teamId !== undefined ||
    input.gameEdition !== undefined ||
    input.platform !== undefined ||
    input.position !== undefined
  );
}

function toPersonalStats(stats: PlayerCompetitionStats): PlayerPersonalStats {
  return {
    playerProfileId: stats.playerProfileId,
    matchesPlayed: stats.matchesPlayed,
    minutes: stats.minutes,
    totals: stats.totals,
    averages: stats.averages,
    per90: stats.per90,
    partial: stats.partial,
    sourceRevisionMax: stats.sourceRevisionMax,
    updatedAt: stats.updatedAt,
  };
}
