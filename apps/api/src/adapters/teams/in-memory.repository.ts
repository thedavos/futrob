import type {
  PlayerExternalClubAssociation,
  PlayerExternalClubAssociationRepository,
  PlayerGameAccount,
  PlayerGameAccountRepository,
  PlayerProfile,
  PlayerProfileRepository,
} from "@futrob/teams";
import type { ActorId } from "@futrob/shared-kernel";

export class InMemoryPlayerProfileRepository implements PlayerProfileRepository {
  readonly rows = new Map<string, PlayerProfile>();

  async findById(playerProfileId: string): Promise<PlayerProfile | null> {
    return this.rows.get(playerProfileId) ?? null;
  }

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

export class InMemoryPlayerExternalClubAssociationRepository implements PlayerExternalClubAssociationRepository {
  readonly rows = new Map<string, PlayerExternalClubAssociation>();

  async findByPlayerProfile(
    playerProfileId: string,
  ): Promise<PlayerExternalClubAssociation | null> {
    return this.rows.get(playerProfileId) ?? null;
  }

  async upsertForPlayerProfile(
    association: PlayerExternalClubAssociation,
  ): Promise<PlayerExternalClubAssociation> {
    this.rows.set(association.playerProfileId, association);
    return association;
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

  async setProviderExternalPlayerId(input: {
    readonly accountId: string;
    readonly providerExternalPlayerId: string;
  }): Promise<PlayerGameAccount | null> {
    const account = this.rows.get(input.accountId);
    if (!account) return null;
    const updated = { ...account, providerExternalPlayerId: input.providerExternalPlayerId };
    this.rows.set(updated.id, updated);
    return updated;
  }

  async findByCorrelation(input: {
    readonly platform: PlayerGameAccount["platform"];
    readonly gameEdition: string;
    readonly providerExternalPlayerId?: string;
    readonly normalizedIdentifier?: string;
  }): Promise<PlayerGameAccount[]> {
    return [...this.rows.values()].filter(
      (row) =>
        row.platform === input.platform &&
        row.gameEdition === input.gameEdition &&
        ((input.providerExternalPlayerId !== undefined &&
          row.providerExternalPlayerId === input.providerExternalPlayerId) ||
          (input.normalizedIdentifier !== undefined &&
            row.normalizedIdentifier === input.normalizedIdentifier)),
    );
  }
}
