import { gameDataProviderKeyQuerySchema } from "@futrob/api-contracts";
import { asTeamId, Panic, type TeamId } from "@futrob/shared-kernel";
import type {
  ExternalClubConnection,
  ExternalClubConnectionRepository,
  ExternalClubTeamReaderPort,
  TeamRepository,
} from "@futrob/teams";
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

export class RepositoryExternalClubTeamReader implements ExternalClubTeamReaderPort {
  constructor(
    private readonly teams: Pick<TeamRepository, "listByOrganization">,
    private readonly connections: Pick<ExternalClubConnectionRepository, "findByTeam">,
  ) {}

  async listTeamIds(
    input: Parameters<ExternalClubTeamReaderPort["listTeamIds"]>[0],
  ): Promise<readonly TeamId[]> {
    if (!this.teams.listByOrganization) {
      throw new Panic("Provider sync discovery requires organization-scoped Teams reads");
    }
    const teams = await this.teams.listByOrganization(input.organizationId);
    const connected = await Promise.all(
      teams.map(async (team) => ({
        team,
        connection: await this.connections.findByTeam(team.id),
      })),
    );
    return connected
      .filter(({ connection }) => connectionMatches(connection, input))
      .map(({ team }) => team.id)
      .sort((left, right) => left.localeCompare(right));
  }
}

export class PostgresExternalClubTeamReader implements ExternalClubTeamReaderPort {
  constructor(private readonly pool: Pool) {}

  async listTeamIds(
    input: Parameters<ExternalClubTeamReaderPort["listTeamIds"]>[0],
  ): Promise<readonly TeamId[]> {
    const result = await this.pool.query(
      `SELECT connection.team_id
       FROM team_external_club_connections AS connection
       INNER JOIN teams AS team ON team.id = connection.team_id
       WHERE team.organization_id = $1
         AND connection.provider_key = $2
         AND connection.external_club_id = $3
         AND connection.game_edition = $4
         AND connection.platform = $5
       ORDER BY connection.team_id ASC`,
      [
        input.organizationId,
        input.providerKey,
        input.externalClubId,
        input.gameEdition,
        input.platform,
      ],
    );
    return result.rows.map((row) => asTeamId(row.team_id));
  }
}

function connectionMatches(
  connection: ExternalClubConnection | null,
  input: Parameters<ExternalClubTeamReaderPort["listTeamIds"]>[0],
): boolean {
  return (
    connection?.providerKey === input.providerKey &&
    connection.externalClubId === input.externalClubId &&
    connection.gameEdition === input.gameEdition &&
    connection.platform === input.platform
  );
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
