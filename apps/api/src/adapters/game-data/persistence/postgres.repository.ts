import type {
  ProviderMatch,
  ProviderMatchRepository,
  GameDataProviderKey,
  RawObservationRepository,
  RawProviderObservation,
} from "@futrob/game-data";
import { gameDataProviderKeyQuerySchema } from "@futrob/api-contracts";
import type { Pool } from "pg";
import { z } from "zod";
import { parseJsonColumn, type PgJsonInput } from "@/adapters/persistence/parse-json-column.ts";
import { pgTextSchema, pgTimestampSchema } from "@/adapters/persistence/pg-scalar.ts";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

const providerPlayerSchema = z.object({
  externalPlayerId: z.string(),
  displayName: z.string(),
  externalClubId: z.string(),
  position: z.string().nullable(),
  minutesPlayed: z.number().nullable(),
  goals: z.number().nullable(),
  assists: z.number().nullable(),
  shots: z.number().nullable(),
  passAttempts: z.number().nullable(),
  passesMade: z.number().nullable(),
  tackleAttempts: z.number().nullable(),
  tacklesMade: z.number().nullable(),
  saves: z.number().nullable(),
  yellowCards: z.number().nullable(),
  redCards: z.number().nullable(),
  isMvp: z.boolean().nullable(),
  rating: z.number().nullable(),
});

const providerMatchRowSchema = z.object({
  id: pgTextSchema,
  provider_key: gameDataProviderKeyQuerySchema,
  external_match_id: pgTextSchema,
  game_edition: pgTextSchema,
  platform: pgTextSchema,
  mode: pgTextSchema,
  occurred_at: pgTimestampSchema,
  home_external_club_id: pgTextSchema,
  home_name: pgTextSchema,
  home_goals: z.coerce.number(),
  away_external_club_id: pgTextSchema,
  away_name: pgTextSchema,
  away_goals: z.coerce.number(),
  players: z.custom<PgJsonInput>((value) => value !== undefined),
  metadata: z.custom<PgJsonInput>((value) => value !== undefined),
});

const providerMatchMetadataSchema = z.object({
  durationSeconds: z.number().nullable(),
  wasDisconnected: z.boolean(),
  winnerByForfeit: z.boolean(),
  completeness: z.enum(["complete", "partial", "unknown"]),
});

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
    return row ? rehydrateMatch(providerMatchRowSchema.parse(row)) : null;
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
    return result.rows.map((row) => rehydrateMatch(providerMatchRowSchema.parse(row)));
  }
}

function rehydrateMatch(row: z.infer<typeof providerMatchRowSchema>): ProviderMatch {
  return {
    id: row.id,
    provider: {
      key: row.provider_key,
      externalMatchId: row.external_match_id,
    },
    game: {
      edition: row.game_edition,
      platform: row.platform,
      mode: row.mode,
    },
    occurredAt: row.occurred_at,
    home: {
      externalClubId: row.home_external_club_id,
      name: row.home_name,
      goals: row.home_goals,
      imageUrl: null,
    },
    away: {
      externalClubId: row.away_external_club_id,
      name: row.away_name,
      goals: row.away_goals,
      imageUrl: null,
    },
    players: parseJsonColumn(z.array(providerPlayerSchema), row.players),
    metadata: parseJsonColumn(providerMatchMetadataSchema, row.metadata),
  };
}
