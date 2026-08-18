import { err, ok, type Result } from "@futrob/shared-kernel";
import type {
  ProviderMatch,
  ProviderPlayerMatchStats,
} from "../../domain/entities/provider-match.ts";
import type { ProviderError } from "../../domain/errors/provider.errors.ts";
import type { GameDataProviderRegistryPort } from "../../domain/ports/game-data-provider-registry.port.ts";
import {
  findPlayerAppearances,
  type PlayerRecentMatchIdentity,
} from "../../domain/policies/player-appears-in-provider-match.ts";
import { externalReferenceKey } from "../../domain/value-objects/external-reference.ts";
import type { GameDataProviderKey } from "../../domain/value-objects/provider-key.ts";

export const PLAYER_RECENT_MATCH_TYPES = ["friendlyMatch", "leagueMatch", "playoffMatch"] as const;

const MAX_RECENT_MATCHES = 50;

export type { PlayerRecentMatchIdentity };

export interface PlayerRecentMatchClub {
  readonly providerKey: GameDataProviderKey;
  readonly externalClubId: string;
  readonly platform: string;
  readonly gameEdition: string;
}

export interface ListPlayerRecentProviderMatchesInput {
  readonly accounts: readonly PlayerRecentMatchIdentity[];
  readonly clubs: readonly PlayerRecentMatchClub[];
}

export type PlayerRecentProviderMatch =
  | {
      readonly kind: "played";
      readonly match: ProviderMatch;
      readonly appearance: ProviderPlayerMatchStats;
      readonly listedExternalClubId: string;
    }
  | {
      readonly kind: "not_played";
      readonly match: ProviderMatch;
      readonly listedExternalClubId: string;
    };

export type PlayerRecentMatchesResult =
  | { readonly status: "needs_club" }
  | { readonly status: "needs_game_account" }
  | { readonly status: "ready"; readonly matches: readonly PlayerRecentProviderMatch[] };

export class ListPlayerRecentProviderMatchesUseCase {
  constructor(private readonly registry: GameDataProviderRegistryPort) {}

  async execute(
    input: ListPlayerRecentProviderMatchesInput,
  ): Promise<Result<PlayerRecentMatchesResult, ProviderError>> {
    if (input.clubs.length === 0) {
      return ok({ status: "needs_club" });
    }
    if (input.accounts.length === 0) {
      return ok({ status: "needs_game_account" });
    }

    const listed = new Map<string, PlayerRecentProviderMatch>();
    let fetchedCount = 0;
    let lastError: ProviderError | undefined;
    for (const club of input.clubs) {
      const provider = this.registry.get(club.providerKey);
      for (const matchType of PLAYER_RECENT_MATCH_TYPES) {
        const result = await provider.getRecentMatches({
          externalClubId: club.externalClubId,
          platform: club.platform,
          gameEdition: club.gameEdition,
          matchType,
          maxResultCount: MAX_RECENT_MATCHES,
        });
        if (!result.isOk()) {
          lastError = result.error;
          continue;
        }
        fetchedCount += result.value.length;
        for (const match of result.value) {
          const row = classifyPlayerRecentMatch(
            match,
            findPlayerAppearances(match, input.accounts),
            club.externalClubId,
          );
          const key = externalReferenceKey({
            providerKey: match.provider.key,
            externalId: match.provider.externalMatchId,
          });
          const existing = listed.get(key);
          if (!existing || shouldReplaceListedMatch(existing, row)) {
            listed.set(key, row);
          }
        }
      }
    }
    if (fetchedCount === 0 && lastError) return err(lastError);

    const matches = [...listed.values()]
      .sort((left, right) => right.match.occurredAt.getTime() - left.match.occurredAt.getTime())
      .slice(0, MAX_RECENT_MATCHES);
    return ok({ status: "ready", matches });
  }
}

function classifyPlayerRecentMatch(
  match: ProviderMatch,
  appearances: readonly ProviderPlayerMatchStats[],
  listedExternalClubId: string,
): PlayerRecentProviderMatch {
  const listedAppearance = appearances.find(
    (appearance) => appearance.externalClubId === listedExternalClubId,
  );
  if (listedAppearance) {
    return {
      kind: "played",
      match,
      appearance: listedAppearance,
      listedExternalClubId,
    };
  }
  return { kind: "not_played", match, listedExternalClubId };
}

function shouldReplaceListedMatch(
  existing: PlayerRecentProviderMatch,
  incoming: PlayerRecentProviderMatch,
): boolean {
  if (existing.kind !== incoming.kind) {
    return incoming.kind === "played";
  }
  return incoming.match.occurredAt.getTime() > existing.match.occurredAt.getTime();
}
