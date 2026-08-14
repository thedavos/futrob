import type {
  ProviderMatch,
  ProviderMatchRepository,
  GameDataProviderKey,
  RawObservationRepository,
  RawProviderObservation,
} from "@futrob/game-data";
import type { Pool } from "pg";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

export class PostgresRawObservationRepository implements RawObservationRepository {
  constructor(private readonly pool: Pool) {}

  async append(observation: RawProviderObservation): Promise<void> {
    await getPgExecutor(this.pool).query(
      `INSERT INTO raw_provider_observations (
         id, provider_key, resource_type, external_resource_id, endpoint_key,
         payload_hash, storage_ref, payload_json, observed_at, http_status, schema_version
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11)
       ON CONFLICT (provider_key, resource_type, external_resource_id, payload_hash)
       DO NOTHING`,
      [
        observation.id,
        observation.providerKey,
        observation.resourceType,
        observation.externalResourceId,
        observation.endpointKey,
        observation.payloadHash,
        observation.storageRef,
        JSON.stringify(observation.payload),
        observation.observedAt.toISOString(),
        observation.httpStatus,
        observation.schemaVersion,
      ],
    );
  }
}

export class PostgresProviderMatchRepository implements ProviderMatchRepository {
  constructor(private readonly pool: Pool) {}

  async upsertMany(matches: readonly ProviderMatch[]): Promise<void> {
    for (const match of matches) {
      await getPgExecutor(this.pool).query(
        `INSERT INTO provider_matches (
           id, provider_key, external_match_id, game_edition, platform, mode, occurred_at,
           home_external_club_id, home_name, home_goals,
           away_external_club_id, away_name, away_goals,
           players, metadata
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7,
           $8, $9, $10,
           $11, $12, $13,
           $14::jsonb, $15::jsonb
         )
         ON CONFLICT (provider_key, external_match_id) DO UPDATE SET
           id = EXCLUDED.id,
           game_edition = EXCLUDED.game_edition,
           platform = EXCLUDED.platform,
           mode = EXCLUDED.mode,
           occurred_at = EXCLUDED.occurred_at,
           home_external_club_id = EXCLUDED.home_external_club_id,
           home_name = EXCLUDED.home_name,
           home_goals = EXCLUDED.home_goals,
           away_external_club_id = EXCLUDED.away_external_club_id,
           away_name = EXCLUDED.away_name,
           away_goals = EXCLUDED.away_goals,
           players = EXCLUDED.players,
           metadata = EXCLUDED.metadata`,
        [
          match.id,
          match.provider.key,
          match.provider.externalMatchId,
          match.game.edition,
          match.game.platform,
          match.game.mode,
          match.occurredAt.toISOString(),
          match.home.externalClubId,
          match.home.name,
          match.home.goals,
          match.away.externalClubId,
          match.away.name,
          match.away.goals,
          JSON.stringify(match.players),
          JSON.stringify(match.metadata),
        ],
      );
    }
  }

  async findByExternalId(input: {
    readonly providerKey: GameDataProviderKey;
    readonly externalMatchId: string;
  }): Promise<ProviderMatch | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, provider_key, external_match_id, game_edition, platform, mode, occurred_at,
              home_external_club_id, home_name, home_goals,
              away_external_club_id, away_name, away_goals,
              players, metadata
       FROM provider_matches
       WHERE provider_key = $1 AND external_match_id = $2`,
      [input.providerKey, input.externalMatchId],
    );
    const row = result.rows[0];
    return row ? rehydrateMatch(row) : null;
  }

  async listBetweenClubs(input: {
    readonly providerKey: GameDataProviderKey;
    readonly homeExternalClubId: string;
    readonly awayExternalClubId: string;
    readonly from: Date;
    readonly to: Date;
  }): Promise<ProviderMatch[]> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, provider_key, external_match_id, game_edition, platform, mode, occurred_at,
              home_external_club_id, home_name, home_goals,
              away_external_club_id, away_name, away_goals,
              players, metadata
       FROM provider_matches
       WHERE provider_key = $1
         AND occurred_at >= $2
         AND occurred_at <= $3
         AND (
           (home_external_club_id = $4 AND away_external_club_id = $5)
           OR (home_external_club_id = $5 AND away_external_club_id = $4)
         )
       ORDER BY occurred_at ASC`,
      [
        input.providerKey,
        input.from.toISOString(),
        input.to.toISOString(),
        input.homeExternalClubId,
        input.awayExternalClubId,
      ],
    );
    return result.rows.map(rehydrateMatch);
  }
}

function rehydrateMatch(row: {
  id: string;
  provider_key: string;
  external_match_id: string;
  game_edition: string;
  platform: string;
  mode: string;
  occurred_at: Date | string;
  home_external_club_id: string;
  home_name: string;
  home_goals: number;
  away_external_club_id: string;
  away_name: string;
  away_goals: number;
  players: unknown;
  metadata: unknown;
}): ProviderMatch {
  return {
    id: row.id,
    provider: {
      key: row.provider_key as GameDataProviderKey,
      externalMatchId: row.external_match_id,
    },
    game: {
      edition: row.game_edition,
      platform: row.platform,
      mode: row.mode,
    },
    occurredAt: new Date(row.occurred_at),
    home: {
      externalClubId: row.home_external_club_id,
      name: row.home_name,
      goals: Number(row.home_goals),
      imageUrl: null,
    },
    away: {
      externalClubId: row.away_external_club_id,
      name: row.away_name,
      goals: Number(row.away_goals),
      imageUrl: null,
    },
    players: row.players as ProviderMatch["players"],
    metadata: row.metadata as ProviderMatch["metadata"],
  };
}
