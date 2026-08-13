import { asActorId } from "@futrob/shared-kernel";
import type { GameDataProviderKey } from "@futrob/game-data";
import type {
  GamePlatform,
  PlayerExternalClubAssociation,
  PlayerExternalClubAssociationRepository,
  PlayerGameAccount,
  PlayerGameAccountRepository,
  PlayerProfile,
  PlayerProfileRepository,
} from "@futrob/teams";
import type { Pool } from "pg";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

export class PostgresPlayerProfileRepository implements PlayerProfileRepository {
  constructor(private readonly pool: Pool) {}

  async findById(playerProfileId: string): Promise<PlayerProfile | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, actor_id, created_at FROM player_profiles WHERE id = $1`,
      [playerProfileId],
    );
    return result.rows[0] ? rehydrateProfile(result.rows[0]) : null;
  }

  async findByActor(actorId: PlayerProfile["actorId"]): Promise<PlayerProfile | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, actor_id, created_at FROM player_profiles WHERE actor_id = $1`,
      [actorId],
    );
    return result.rows[0] ? rehydrateProfile(result.rows[0]) : null;
  }

  async saveIfAbsent(profile: PlayerProfile): Promise<PlayerProfile> {
    const result = await getPgExecutor(this.pool).query(
      `INSERT INTO player_profiles (id, actor_id, created_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (actor_id) DO UPDATE SET actor_id = EXCLUDED.actor_id
       RETURNING id, actor_id, created_at`,
      [profile.id, profile.actorId, profile.createdAt.toISOString()],
    );
    return rehydrateProfile(result.rows[0]);
  }
}

export class PostgresPlayerExternalClubAssociationRepository implements PlayerExternalClubAssociationRepository {
  constructor(private readonly pool: Pool) {}

  async findByPlayerProfile(
    playerProfileId: string,
  ): Promise<PlayerExternalClubAssociation | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT player_profile_id, provider_key, external_club_id, external_club_name,
              platform, game_edition, image_url, associated_at
       FROM player_external_club_associations
       WHERE player_profile_id = $1`,
      [playerProfileId],
    );
    return result.rows[0] ? rehydrateAssociation(result.rows[0]) : null;
  }

  async upsertForPlayerProfile(
    association: PlayerExternalClubAssociation,
  ): Promise<PlayerExternalClubAssociation> {
    const result = await getPgExecutor(this.pool).query(
      `INSERT INTO player_external_club_associations (
         player_profile_id, provider_key, external_club_id, external_club_name,
         platform, game_edition, image_url, associated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (player_profile_id) DO UPDATE SET
         provider_key = EXCLUDED.provider_key,
         external_club_id = EXCLUDED.external_club_id,
         external_club_name = EXCLUDED.external_club_name,
         platform = EXCLUDED.platform,
         game_edition = EXCLUDED.game_edition,
         image_url = EXCLUDED.image_url,
         associated_at = EXCLUDED.associated_at
       RETURNING player_profile_id, provider_key, external_club_id, external_club_name,
                 platform, game_edition, image_url, associated_at`,
      [
        association.playerProfileId,
        association.providerKey,
        association.externalClubId,
        association.externalClubName,
        association.platform,
        association.gameEdition,
        association.imageUrl,
        association.associatedAt.toISOString(),
      ],
    );
    return rehydrateAssociation(result.rows[0]);
  }
}

export class PostgresPlayerGameAccountRepository implements PlayerGameAccountRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<PlayerGameAccount | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, player_profile_id, identifier, normalized_identifier,
              provider_external_player_id, platform, game_edition, created_at
       FROM player_game_accounts
       WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? rehydrateAccount(row) : null;
  }

  async listByProfile(playerProfileId: string): Promise<PlayerGameAccount[]> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, player_profile_id, identifier, normalized_identifier,
              provider_external_player_id, platform, game_edition, created_at
       FROM player_game_accounts
       WHERE player_profile_id = $1
       ORDER BY created_at ASC`,
      [playerProfileId],
    );
    return result.rows.map(rehydrateAccount);
  }

  async saveIfAbsent(account: PlayerGameAccount): Promise<PlayerGameAccount> {
    const result = await getPgExecutor(this.pool).query(
      `INSERT INTO player_game_accounts (
         id, player_profile_id, identifier, normalized_identifier,
         provider_external_player_id, platform, game_edition, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (player_profile_id, normalized_identifier, platform, game_edition)
       DO UPDATE SET
         identifier = EXCLUDED.identifier,
         provider_external_player_id = COALESCE(
           player_game_accounts.provider_external_player_id,
           EXCLUDED.provider_external_player_id
         )
       RETURNING id, player_profile_id, identifier, normalized_identifier,
                 provider_external_player_id, platform, game_edition, created_at`,
      [
        account.id,
        account.playerProfileId,
        account.identifier,
        account.normalizedIdentifier,
        account.providerExternalPlayerId,
        account.platform,
        account.gameEdition,
        account.createdAt.toISOString(),
      ],
    );
    return rehydrateAccount(result.rows[0]);
  }

  async setProviderExternalPlayerId(input: {
    readonly accountId: string;
    readonly providerExternalPlayerId: string;
  }): Promise<PlayerGameAccount | null> {
    const result = await getPgExecutor(this.pool).query(
      `UPDATE player_game_accounts
       SET provider_external_player_id = $2
       WHERE id = $1
       RETURNING id, player_profile_id, identifier, normalized_identifier,
                 provider_external_player_id, platform, game_edition, created_at`,
      [input.accountId, input.providerExternalPlayerId],
    );
    const row = result.rows[0];
    return row ? rehydrateAccount(row) : null;
  }

  async findByCorrelation(input: {
    readonly platform: GamePlatform;
    readonly gameEdition: string;
    readonly providerExternalPlayerId?: string;
    readonly normalizedIdentifier?: string;
  }): Promise<PlayerGameAccount[]> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, player_profile_id, identifier, normalized_identifier,
              provider_external_player_id, platform, game_edition, created_at
       FROM player_game_accounts
       WHERE platform = $1
         AND game_edition = $2
         AND (
           ($3::text IS NOT NULL AND provider_external_player_id = $3)
           OR ($4::text IS NOT NULL AND normalized_identifier = $4)
         )`,
      [
        input.platform,
        input.gameEdition,
        input.providerExternalPlayerId ?? null,
        input.normalizedIdentifier ?? null,
      ],
    );
    return result.rows.map(rehydrateAccount);
  }
}

function rehydrateProfile(row: {
  id: string;
  actor_id: string;
  created_at: Date | string;
}): PlayerProfile {
  return { id: row.id, actorId: asActorId(row.actor_id), createdAt: new Date(row.created_at) };
}

function rehydrateAccount(row: {
  id: string;
  player_profile_id: string;
  identifier: string;
  normalized_identifier: string;
  provider_external_player_id: string | null;
  platform: string;
  game_edition: string;
  created_at: Date | string;
}): PlayerGameAccount {
  return {
    id: row.id,
    playerProfileId: row.player_profile_id,
    identifier: row.identifier,
    normalizedIdentifier: row.normalized_identifier,
    providerExternalPlayerId: row.provider_external_player_id,
    platform: row.platform as GamePlatform,
    gameEdition: row.game_edition,
    createdAt: new Date(row.created_at),
  };
}

function rehydrateAssociation(row: {
  player_profile_id: string;
  provider_key: string;
  external_club_id: string;
  external_club_name: string;
  platform: string;
  game_edition: string;
  image_url: string | null;
  associated_at: Date | string;
}): PlayerExternalClubAssociation {
  return {
    playerProfileId: row.player_profile_id,
    providerKey: row.provider_key as GameDataProviderKey,
    externalClubId: row.external_club_id,
    externalClubName: row.external_club_name,
    platform: row.platform,
    gameEdition: row.game_edition,
    imageUrl: row.image_url,
    associatedAt: new Date(row.associated_at),
  };
}
