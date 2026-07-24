import type {
  ProviderMatch,
  ProviderMatchRepository,
  GameDataProviderKey,
} from "@futrob/game-data";
import { externalReferenceKey } from "@futrob/game-data";

/**
 * In-memory stub for `ProviderMatchRepository`. Domain match tables are not
 * modelled in Postgres yet; game-data today is EA HTTP plus ports. This keeps
 * the composition root honest until a real adapter lands.
 */
export class InMemoryProviderMatchRepository implements ProviderMatchRepository {
  private readonly byKey = new Map<string, ProviderMatch>();

  upsertMany(matches: readonly ProviderMatch[]): Promise<void> {
    for (const match of matches) {
      const key = externalReferenceKey({
        providerKey: match.provider.key,
        externalId: match.provider.externalMatchId,
      });
      this.byKey.set(key, match);
    }
    return Promise.resolve();
  }

  listBetweenClubs(input: {
    readonly providerKey: GameDataProviderKey;
    readonly homeExternalClubId: string;
    readonly awayExternalClubId: string;
    readonly from: Date;
    readonly to: Date;
  }): Promise<ProviderMatch[]> {
    const clubs = new Set([input.homeExternalClubId, input.awayExternalClubId]);
    const matches = [...this.byKey.values()].filter(
      (match) =>
        match.provider.key === input.providerKey &&
        clubs.has(match.home.externalClubId) &&
        clubs.has(match.away.externalClubId) &&
        match.occurredAt >= input.from &&
        match.occurredAt <= input.to,
    );
    return Promise.resolve(matches);
  }
}
