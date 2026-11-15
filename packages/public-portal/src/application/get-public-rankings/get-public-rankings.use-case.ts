import { err, ok, type Result } from "@futrob/shared-kernel";
import type {
  PublicRanking,
  PublicRankingKind,
  PublicRankingRow,
} from "../../domain/entities/public-competition.ts";
import type { PublicCompetitionNotFound } from "../../domain/errors/public-portal.errors.ts";
import type { PublicCompetitionKey } from "../../domain/public-competition-key.ts";
import type {
  PublicPlayerDirectoryPort,
  PublicRankingsReaderPort,
} from "../../domain/ports/public-rankings-reader.port.ts";
import type { PublicTeamDirectoryPort } from "../../domain/ports/public-team-directory.port.ts";
import type { PublishedCompetitionReaderPort } from "../../domain/ports/published-competition-reader.port.ts";
import { resolvePublishedCompetition } from "../resolve-published-competition.ts";

export interface GetPublicRankingsDependencies {
  readonly competitions: PublishedCompetitionReaderPort;
  readonly rankings: PublicRankingsReaderPort;
  readonly players: PublicPlayerDirectoryPort;
  readonly teams: PublicTeamDirectoryPort;
}

export class GetPublicRankingsUseCase {
  constructor(private readonly deps: GetPublicRankingsDependencies) {}

  /**
   * One official ranking of a published competition. Players appear by the game account they
   * declared on their roster; a row without a public player name is left out.
   */
  async execute(input: {
    readonly key: PublicCompetitionKey;
    readonly kind: PublicRankingKind;
  }): Promise<Result<PublicRanking, PublicCompetitionNotFound>> {
    const resolved = await resolvePublishedCompetition(this.deps.competitions, input.key);
    if (!resolved.isOk()) return err(resolved.error);
    const { scope } = resolved.value;

    const source = await this.deps.rankings.read(scope, input.kind);
    if (!source) return ok({ kind: input.kind, rows: [], updatedAt: null });

    const [players, teams] = await Promise.all([
      this.deps.players.namesOf(
        scope,
        source.rows.map(({ playerProfileId, teamId }) => ({ playerProfileId, teamId })),
      ),
      this.deps.teams.namesByIds(
        scope,
        source.rows.flatMap((row) => (row.teamId ? [row.teamId] : [])),
      ),
    ]);
    return ok({
      kind: input.kind,
      updatedAt: source.updatedAt,
      rows: source.rows.flatMap((row): PublicRankingRow[] => {
        const playerName = players.get(row.playerProfileId);
        if (playerName === undefined) return [];
        return [
          {
            position: row.position,
            playerName,
            teamName: row.teamId ? (teams.get(row.teamId) ?? null) : null,
            value: row.value,
            matchesPlayed: row.matchesPlayed,
          },
        ];
      }),
    });
  }
}
