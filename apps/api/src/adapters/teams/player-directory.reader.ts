import { gamePlatformSchema } from "@futrob/api-contracts";
import type {
  PlayerDirectoryEntry,
  PlayerDirectoryReader,
  PlayerExternalClubAssociationRepository,
  PlayerProfileRepository,
} from "@futrob/teams";
import { asActorId } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";
import type { InMemoryPlayerGameAccountRepository } from "./in-memory.repository.ts";

/** Escapes LIKE wildcards so a typed `_` or `%` matches literally. */
function likePrefix(prefix: string): string {
  return `${prefix.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}

export class PostgresPlayerDirectoryReader implements PlayerDirectoryReader {
  constructor(private readonly pool: Pool) {}

  async searchByGamertagPrefix(
    prefix: string,
    limit: number,
  ): Promise<readonly PlayerDirectoryEntry[]> {
    const result = await getPgExecutor(this.pool).query<{
      actor_id: string;
      identifier: string;
      platform: string;
      game_edition: string;
      club_name: string | null;
      club_image_url: string | null;
      club_platform: string | null;
    }>(
      `SELECT * FROM (
         SELECT DISTINCT ON (profile.id)
                profile.actor_id, account.identifier, account.platform, account.game_edition,
                club.external_club_name AS club_name, club.image_url AS club_image_url,
                club.platform AS club_platform
         FROM player_game_accounts account
         JOIN player_profiles profile ON profile.id = account.player_profile_id
         LEFT JOIN LATERAL (
           SELECT external_club_name, image_url, platform
           FROM player_external_club_associations
           WHERE player_profile_id = profile.id
           ORDER BY associated_at DESC
           LIMIT 1
         ) club ON TRUE
         WHERE account.normalized_identifier LIKE $1
         ORDER BY profile.id, account.normalized_identifier, account.created_at
       ) player
       ORDER BY lower(player.identifier), player.actor_id
       LIMIT $2`,
      [likePrefix(prefix), limit],
    );
    return result.rows.map((row) => ({
      actorId: asActorId(row.actor_id),
      gamertag: row.identifier,
      platform: gamePlatformSchema.parse(row.platform),
      gameEdition: row.game_edition,
      club:
        row.club_name === null
          ? null
          : {
              name: row.club_name,
              imageUrl: row.club_image_url,
              platform: row.club_platform ?? row.platform,
            },
    }));
  }
}

/** Reads the process-local repositories the API uses without a database. */
export class RepositoryPlayerDirectoryReader implements PlayerDirectoryReader {
  constructor(
    private readonly deps: {
      readonly accounts: InMemoryPlayerGameAccountRepository;
      readonly profiles: PlayerProfileRepository;
      readonly associations: PlayerExternalClubAssociationRepository;
    },
  ) {}

  async searchByGamertagPrefix(
    prefix: string,
    limit: number,
  ): Promise<readonly PlayerDirectoryEntry[]> {
    const byProfile = new Map<string, PlayerDirectoryEntry>();
    const accounts = [...this.deps.accounts.rows.values()]
      .filter((account) => account.normalizedIdentifier.startsWith(prefix))
      .sort((left, right) => left.identifier.localeCompare(right.identifier, "en-US"));
    for (const account of accounts) {
      if (byProfile.has(account.playerProfileId)) continue;
      const profile = await this.deps.profiles.findById(account.playerProfileId);
      if (!profile) continue;
      const [club] = await this.deps.associations.listByPlayerProfile(profile.id);
      byProfile.set(profile.id, {
        actorId: profile.actorId,
        gamertag: account.identifier,
        platform: account.platform,
        gameEdition: account.gameEdition,
        club: club
          ? { name: club.externalClubName, imageUrl: club.imageUrl, platform: club.platform }
          : null,
      });
    }
    return [...byProfile.values()].slice(0, limit);
  }
}
