import type { ActorId, AuthorizationPort, CompetitionId, TeamId } from "@futrob/shared-kernel";
import type { PlayerMatchContribution } from "../../domain/entities/player-match-contribution.ts";
import { StatisticsAuthorizationForbidden } from "../../domain/errors/statistics.errors.ts";
import type { PlayerMatchContributionRepository } from "../../domain/ports/player-match-contribution.repository.ts";
import type { PlayerProfileLookupPort } from "../../domain/ports/player-profile-lookup.port.ts";
import { STATISTICS_PERMISSION } from "../../domain/policies/statistics-permissions.ts";

export interface ListMyMatchContributionsInput {
  readonly actorId: ActorId;
  readonly competitionId?: CompetitionId;
  readonly teamId?: TeamId;
  readonly gameEdition?: string;
  readonly platform?: string;
  readonly position?: string;
  readonly cursor?: string;
  readonly limit: number;
}

export interface ListMyMatchContributionsOutput {
  readonly items: PlayerMatchContribution[];
  readonly nextCursor: string | null;
}

export interface ListMyMatchContributionsDependencies {
  readonly contributions: PlayerMatchContributionRepository;
  readonly profiles: PlayerProfileLookupPort;
  readonly authorization: AuthorizationPort;
}

export class ListMyMatchContributionsUseCase {
  constructor(private readonly deps: ListMyMatchContributionsDependencies) {}

  async execute(input: ListMyMatchContributionsInput): Promise<ListMyMatchContributionsOutput> {
    const profile = await this.deps.profiles.findByActor(input.actorId);
    const decision = await this.deps.authorization.decide({
      actorId: input.actorId,
      permission: STATISTICS_PERMISSION.readOwn,
      scope: {},
    });
    if (!decision.allowed) {
      throw new StatisticsAuthorizationForbidden({
        code: "statistics.read_own_forbidden",
        message: "The actor cannot read personal match contributions",
      });
    }
    if (!profile) return { items: [], nextCursor: null };

    return this.deps.contributions.listMatchedPage({
      playerProfileId: profile.id,
      ...(input.competitionId === undefined ? {} : { competitionId: input.competitionId }),
      ...(input.teamId === undefined ? {} : { teamId: input.teamId }),
      ...(input.gameEdition === undefined ? {} : { gameEdition: input.gameEdition }),
      ...(input.platform === undefined ? {} : { platform: input.platform }),
      ...(input.position === undefined ? {} : { position: input.position }),
      ...(input.cursor === undefined ? {} : { cursor: input.cursor }),
      limit: input.limit,
    });
  }
}
