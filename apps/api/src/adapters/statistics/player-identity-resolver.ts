import type { PlayerIdentityResolution, PlayerIdentityResolverPort } from "@futrob/statistics";
import {
  normalizeGameAccountIdentifier,
  type CompetitionRosterMembershipRepository,
  type PlayerGameAccount,
  type PlayerGameAccountRepository,
} from "@futrob/teams";
import {
  asCompetitionId,
  asOrganizationId,
  asTeamId,
  type GamePlatform,
} from "@futrob/shared-kernel";

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
  constructor(
    private readonly rosters: CompetitionRosterMembershipRepository,
    private readonly accounts: PlayerGameAccountRepository,
  ) {}

  async resolve(
    input: Parameters<PlayerIdentityResolverPort["resolve"]>[0],
  ): Promise<PlayerIdentityResolution> {
    const platforms = PLATFORM_CANDIDATES.get(input.platform) ?? [];
    const editions = gameEditionCandidates(input.gameEdition);
    const rosterResolution = await this.resolveRosterMatches(input, platforms, editions);
    if (rosterResolution.status !== "unmatched") return rosterResolution;

    const globalResolution = await this.resolveGlobally(input, platforms, editions);
    if (globalResolution.status !== "matched" || input.competitionId === undefined) {
      return globalResolution;
    }

    const membership =
      input.teamId === undefined
        ? await this.rosters.findByPlayerAndCompetition(
            globalResolution.playerProfileId,
            asCompetitionId(input.competitionId),
          )
        : await this.rosters.findByTeamPlayerCompetition(
            asTeamId(input.teamId),
            globalResolution.playerProfileId,
            asCompetitionId(input.competitionId),
          );
    if (
      membership?.gameAccountId === null ||
      membership?.gameAccountId === undefined ||
      membership.gameAccountId === globalResolution.gameAccountId
    ) {
      return globalResolution;
    }

    const pinnedAccount = await this.accounts.findById(membership.gameAccountId);
    if (!pinnedAccount) return globalResolution;
    if (pinnedAccount.playerProfileId !== globalResolution.playerProfileId) {
      return { status: "ambiguous" };
    }
    return resolveMatches([pinnedAccount]);
  }

  private async resolveRosterMatches(
    input: Parameters<PlayerIdentityResolverPort["resolve"]>[0],
    platforms: readonly GamePlatform[],
    editions: readonly string[],
  ): Promise<PlayerIdentityResolution> {
    if (
      input.organizationId === undefined ||
      input.competitionId === undefined ||
      input.teamId === undefined
    ) {
      return { status: "unmatched" };
    }

    const memberships = await this.rosters.listByTeam(
      asOrganizationId(input.organizationId),
      asCompetitionId(input.competitionId),
      asTeamId(input.teamId),
    );
    const accountIds = [
      ...new Set(
        memberships
          .map((membership) => membership.gameAccountId)
          .filter((accountId): accountId is string => accountId !== null),
      ),
    ];
    const accounts = await Promise.all(
      accountIds.map((accountId) => this.accounts.findById(accountId)),
    );
    const normalizedIdentifier = normalizeGameAccountIdentifier(input.externalPlayerId);
    return resolveMatches(
      accounts.filter(
        (account): account is PlayerGameAccount =>
          account !== null &&
          platforms.includes(account.platform) &&
          editions.includes(account.gameEdition) &&
          (account.providerExternalPlayerId === input.externalPlayerId ||
            account.normalizedIdentifier === normalizedIdentifier),
      ),
    );
  }

  private async resolveGlobally(
    input: Parameters<PlayerIdentityResolverPort["resolve"]>[0],
    platforms: readonly GamePlatform[],
    editions: readonly string[],
  ): Promise<PlayerIdentityResolution> {
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
