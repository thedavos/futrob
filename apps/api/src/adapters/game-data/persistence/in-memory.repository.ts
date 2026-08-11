import type {
  ProviderMatch,
  ProviderMatchRepository,
  GameDataProviderKey,
  RawObservationRepository,
  RawProviderObservation,
} from "@futrob/game-data";
import { externalReferenceKey } from "@futrob/game-data";

export class InMemoryRawObservationRepository implements RawObservationRepository {
  readonly rows: RawProviderObservation[] = [];

  append(observation: RawProviderObservation): Promise<void> {
    const duplicate = this.rows.some(
      (row) =>
        row.providerKey === observation.providerKey &&
        row.resourceType === observation.resourceType &&
        row.externalResourceId === observation.externalResourceId &&
        row.payloadHash === observation.payloadHash,
    );
    if (!duplicate) {
      this.rows.push(observation);
    }
    return Promise.resolve();
  }
}

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
