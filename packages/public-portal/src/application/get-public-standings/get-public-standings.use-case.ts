import { err, ok, type Result } from "@futrob/shared-kernel";
import type {
  PublicStandingRow,
  PublicStandings,
} from "../../domain/entities/public-competition.ts";
import type { PublicCompetitionNotFound } from "../../domain/errors/public-portal.errors.ts";
import type { PublicCompetitionKey } from "../../domain/public-competition-key.ts";
import type { PublicStandingsReaderPort } from "../../domain/ports/public-standings-reader.port.ts";
import type { PublicTeamDirectoryPort } from "../../domain/ports/public-team-directory.port.ts";
import type { PublishedCompetitionReaderPort } from "../../domain/ports/published-competition-reader.port.ts";
import { resolvePublishedCompetition } from "../resolve-published-competition.ts";

export interface GetPublicStandingsDependencies {
  readonly competitions: PublishedCompetitionReaderPort;
  readonly standings: PublicStandingsReaderPort;
  readonly teams: PublicTeamDirectoryPort;
}

export class GetPublicStandingsUseCase {
  constructor(private readonly deps: GetPublicStandingsDependencies) {}

  /**
   * Official table of a published competition. Before any approved result it is an empty
   * table, not an error. A row whose team name cannot be resolved is left out rather than
   * labelled with an internal id.
   */
  async execute(input: {
    readonly key: PublicCompetitionKey;
  }): Promise<Result<PublicStandings, PublicCompetitionNotFound>> {
    const resolved = await resolvePublishedCompetition(this.deps.competitions, input.key);
    if (!resolved.isOk()) return err(resolved.error);
    const { scope } = resolved.value;

    const snapshot = await this.deps.standings.read(scope);
    if (!snapshot) return ok({ rows: [], updatedAt: null });

    const names = await this.deps.teams.namesByIds(
      scope,
      snapshot.rows.map((row) => row.teamId),
    );
    return ok({
      rows: snapshot.rows.flatMap((row): PublicStandingRow[] => {
        const teamName = names.get(row.teamId);
        if (teamName === undefined) return [];
        return [
          {
            position: row.position,
            teamName,
            played: row.played,
            wins: row.wins,
            draws: row.draws,
            losses: row.losses,
            goalsFor: row.goalsFor,
            goalsAgainst: row.goalsAgainst,
            goalDifference: row.goalDifference,
            points: row.points,
          },
        ];
      }),
      updatedAt: snapshot.updatedAt,
    });
  }
}
