import { gameDataProviderKeyQuerySchema } from "@futrob/api-contracts";
import { asTeamId, type TeamId } from "@futrob/shared-kernel";
import type { ExternalClubConnection, ExternalClubConnectionRepository } from "@futrob/teams";
import type { Pool } from "pg";

export class InMemoryExternalClubConnectionRepository implements ExternalClubConnectionRepository {
  readonly rows = new Map<TeamId, ExternalClubConnection>();

  async findByTeam(teamId: TeamId): Promise<ExternalClubConnection | null> {
    return this.rows.get(teamId) ?? null;
  }

  async upsert(connection: ExternalClubConnection): Promise<ExternalClubConnection> {
    this.rows.set(connection.teamId, connection);
    return connection;
  }
}

export class PostgresExternalClubConnectionRepository implements ExternalClubConnectionRepository {
  constructor(private readonly pool: Pool) {}

  async findByTeam(teamId: TeamId): Promise<ExternalClubConnection | null> {
    const result = await this.pool.query(
      `SELECT team_id, provider_key, external_club_id, external_club_name,
              game_edition, platform
       FROM team_external_club_connections WHERE team_id = $1`,
      [teamId],
    );
    return result.rows[0] ? rehydrate(result.rows[0]) : null;
  }

  async upsert(connection: ExternalClubConnection): Promise<ExternalClubConnection> {
    const result = await this.pool.query(
      `INSERT INTO team_external_club_connections (
         team_id, provider_key, external_club_id, external_club_name,
         game_edition, platform
       ) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (team_id) DO UPDATE SET
         provider_key = EXCLUDED.provider_key,
         external_club_id = EXCLUDED.external_club_id,
         external_club_name = EXCLUDED.external_club_name,
         game_edition = EXCLUDED.game_edition,
         platform = EXCLUDED.platform
       RETURNING team_id, provider_key, external_club_id, external_club_name,
                 game_edition, platform`,
      [
        connection.teamId,
        connection.providerKey,
        connection.externalClubId,
        connection.externalClubName,
        connection.gameEdition,
        connection.platform,
      ],
    );
    return rehydrate(result.rows[0]);
  }
}

function rehydrate(row: {
  team_id: string;
  provider_key: string;
  external_club_id: string;
  external_club_name: string;
  game_edition: string;
  platform: string;
}): ExternalClubConnection {
  return {
    teamId: asTeamId(row.team_id),
    providerKey: gameDataProviderKeyQuerySchema.parse(row.provider_key),
    externalClubId: row.external_club_id,
    externalClubName: row.external_club_name,
    gameEdition: row.game_edition,
    platform: row.platform,
  };
}
