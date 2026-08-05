import { asTeamId, type OrganizationId, type TeamId } from "@futrob/shared-kernel";
import type { ExternalClubConnection, ExternalClubConnectionRepository } from "@futrob/teams";
import type { GameDataProviderKey } from "@futrob/game-data";
import type { TeamExternalClubVerificationPort } from "@futrob/competitions";
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
              game_edition, platform, verified_at, verified_by
       FROM team_external_club_connections WHERE team_id = $1`,
      [teamId],
    );
    return result.rows[0] ? rehydrate(result.rows[0]) : null;
  }

  async upsert(connection: ExternalClubConnection): Promise<ExternalClubConnection> {
    const result = await this.pool.query(
      `INSERT INTO team_external_club_connections (
         team_id, provider_key, external_club_id, external_club_name,
         game_edition, platform, verified_at, verified_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (team_id) DO UPDATE SET
         provider_key = EXCLUDED.provider_key,
         external_club_id = EXCLUDED.external_club_id,
         external_club_name = EXCLUDED.external_club_name,
         game_edition = EXCLUDED.game_edition,
         platform = EXCLUDED.platform,
         verified_at = EXCLUDED.verified_at,
         verified_by = EXCLUDED.verified_by
       RETURNING team_id, provider_key, external_club_id, external_club_name,
                 game_edition, platform, verified_at, verified_by`,
      [
        connection.teamId,
        connection.providerKey,
        connection.externalClubId,
        connection.externalClubName,
        connection.gameEdition,
        connection.platform,
        connection.verifiedAt?.toISOString() ?? null,
        connection.verifiedBy,
      ],
    );
    return rehydrate(result.rows[0]);
  }
}

export class ExternalClubVerificationAdapter implements TeamExternalClubVerificationPort {
  constructor(private readonly connections: ExternalClubConnectionRepository) {}

  async isVerified(_organizationId: OrganizationId, teamId: TeamId): Promise<boolean> {
    const connection = await this.connections.findByTeam(teamId);
    return connection?.verifiedAt != null;
  }
}

function rehydrate(row: {
  team_id: string;
  provider_key: string;
  external_club_id: string;
  external_club_name: string;
  game_edition: string;
  platform: string;
  verified_at: Date | string | null;
  verified_by: string | null;
}): ExternalClubConnection {
  return {
    teamId: asTeamId(row.team_id),
    providerKey: row.provider_key as GameDataProviderKey,
    externalClubId: row.external_club_id,
    externalClubName: row.external_club_name,
    gameEdition: row.game_edition,
    platform: row.platform,
    verifiedAt: row.verified_at ? new Date(row.verified_at) : null,
    verifiedBy: row.verified_by,
  };
}
