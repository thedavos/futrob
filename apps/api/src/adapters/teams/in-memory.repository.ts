import type {
  PlayerGameAccount,
  PlayerGameAccountRepository,
  PlayerProfile,
  PlayerProfileRepository,
} from "@futrob/teams";
import type { ActorId } from "@futrob/shared-kernel";

export class InMemoryPlayerProfileRepository implements PlayerProfileRepository {
  readonly rows = new Map<string, PlayerProfile>();

  async findByActor(actorId: ActorId): Promise<PlayerProfile | null> {
    return [...this.rows.values()].find((row) => row.actorId === actorId) ?? null;
  }

  async saveIfAbsent(profile: PlayerProfile): Promise<PlayerProfile> {
    const existing = await this.findByActor(profile.actorId);
    if (existing) return existing;
    this.rows.set(profile.id, profile);
    return profile;
  }
}

export class InMemoryPlayerGameAccountRepository implements PlayerGameAccountRepository {
  readonly rows = new Map<string, PlayerGameAccount>();

  async listByProfile(playerProfileId: string): Promise<PlayerGameAccount[]> {
    return [...this.rows.values()].filter((row) => row.playerProfileId === playerProfileId);
  }

  async saveIfAbsent(account: PlayerGameAccount): Promise<PlayerGameAccount> {
    const existing = [...this.rows.values()].find(
      (row) =>
        row.playerProfileId === account.playerProfileId &&
        row.normalizedIdentifier === account.normalizedIdentifier &&
        row.platform === account.platform &&
        row.gameEdition === account.gameEdition,
    );
    if (existing) return existing;
    this.rows.set(account.id, account);
    return account;
  }
}
