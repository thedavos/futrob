import type { PlayerIdentityResolution, PlayerIdentityResolverPort } from "@futrob/statistics";
import {
  normalizeGameAccountIdentifier,
  type PlayerGameAccount,
  type PlayerGameAccountRepository,
} from "@futrob/teams";
import type { GamePlatform } from "@futrob/shared-kernel";

const PLATFORM_CANDIDATES = new Map<string, readonly GamePlatform[]>([
  ["playstation", ["playstation"]],
  ["xbox", ["xbox"]],
  ["pc", ["pc"]],
  ["nintendo-switch-1", ["nintendo-switch-1"]],
  ["nintendo-switch-2", ["nintendo-switch-2"]],
  ["common-gen5", ["playstation", "xbox"]],
  ["common-gen4", ["playstation", "xbox"]],
]);

export class TeamsPlayerIdentityResolver implements PlayerIdentityResolverPort {
  constructor(private readonly accounts: PlayerGameAccountRepository) {}

  async resolve(
    input: Parameters<PlayerIdentityResolverPort["resolve"]>[0],
  ): Promise<PlayerIdentityResolution> {
    const platforms = PLATFORM_CANDIDATES.get(input.platform) ?? [];
    const editions = gameEditionCandidates(input.gameEdition);
    const providerIdMatches = await this.findCandidates({
      platforms,
      editions,
      providerExternalPlayerId: input.externalPlayerId,
    });
    const providerIdResolution = resolveMatches(providerIdMatches);
    if (providerIdResolution.status !== "unmatched") return providerIdResolution;

    const identifierMatches = await this.findCandidates({
      platforms,
      editions,
      normalizedIdentifier: normalizeGameAccountIdentifier(input.externalPlayerId),
    });
    return resolveMatches(identifierMatches);
  }

  private async findCandidates(input: {
    readonly platforms: readonly GamePlatform[];
    readonly editions: readonly string[];
    readonly providerExternalPlayerId?: string;
    readonly normalizedIdentifier?: string;
  }): Promise<PlayerGameAccount[]> {
    const matches = new Map<string, PlayerGameAccount>();
    for (const platform of input.platforms) {
      for (const gameEdition of input.editions) {
        const candidates = await this.accounts.findByCorrelation({
          platform,
          gameEdition,
          providerExternalPlayerId: input.providerExternalPlayerId,
          normalizedIdentifier: input.normalizedIdentifier,
        });
        for (const candidate of candidates) matches.set(candidate.id, candidate);
      }
    }
    return [...matches.values()];
  }
}

function resolveMatches(matches: readonly PlayerGameAccount[]): PlayerIdentityResolution {
  if (matches.length === 0) return { status: "unmatched" };
  if (matches.length > 1) return { status: "ambiguous" };
  const match = matches[0];
  if (!match) return { status: "unmatched" };
  return {
    status: "matched",
    playerProfileId: match.playerProfileId,
    gameAccountId: match.id,
  };
}

function gameEditionCandidates(gameEdition: string): string[] {
  const trimmed = gameEdition.trim();
  const compact = trimmed.replace(/\s+/g, "");
  const match = /^fc(\d+)$/i.exec(compact);
  if (!match?.[1]) {
    return [...new Set([trimmed, trimmed.toLocaleLowerCase("en-US")])];
  }
  const number = match[1];
  return [...new Set([trimmed, `fc${number}`, `FC${number}`, `FC ${number}`, `fc ${number}`])];
}
