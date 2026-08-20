import { describe, expect, it } from "vite-plus/test";
import { err, ok } from "@futrob/shared-kernel";
import type {
  ProviderMatch,
  ProviderPlayerMatchStats,
} from "../../domain/entities/provider-match.ts";
import { ProviderUnavailable } from "../../domain/errors/provider.errors.ts";
import type { GameDataProviderPort } from "../../domain/ports/game-data-provider.port.ts";
import type { GameDataProviderRegistryPort } from "../../domain/ports/game-data-provider-registry.port.ts";
import {
  ListPlayerRecentProviderMatchesUseCase,
  PLAYER_RECENT_MATCH_TYPES,
} from "./list-player-recent-provider-matches.use-case.ts";

describe("ListPlayerRecentProviderMatchesUseCase", () => {
  it("returns needs_club and does not call the provider when no clubs are associated", async () => {
    const provider = recordingProvider();
    const useCase = new ListPlayerRecentProviderMatchesUseCase(registryOf(provider));

    const result = await useCase.execute({
      accounts: [account({ identifier: "davos282", normalizedIdentifier: "davos282" })],
      clubs: [],
    });

    expect(result).toEqual(ok({ status: "needs_club" }));
    expect(provider.calls).toEqual([]);
  });

  it("returns needs_game_account and does not call the provider when clubs exist but no accounts", async () => {
    const provider = recordingProvider();
    const useCase = new ListPlayerRecentProviderMatchesUseCase(registryOf(provider));

    const result = await useCase.execute({
      accounts: [],
      clubs: [club()],
    });

    expect(result).toEqual(ok({ status: "needs_game_account" }));
    expect(provider.calls).toEqual([]);
  });

  it("fetches friendly, league, and playoff matches for each associated club", async () => {
    const provider = recordingProvider();
    const useCase = new ListPlayerRecentProviderMatchesUseCase(registryOf(provider));

    const result = await useCase.execute({
      accounts: [account({ identifier: "davos282", normalizedIdentifier: "davos282" })],
      clubs: [club({ externalClubId: "10754" })],
    });

    expect(result.isOk()).toBe(true);
    expect(provider.calls.map((call) => call.matchType).sort()).toEqual(
      [...PLAYER_RECENT_MATCH_TYPES].sort(),
    );
    expect(provider.calls.every((call) => call.externalClubId === "10754")).toBe(true);
    expect(provider.calls.every((call) => call.maxResultCount === 50)).toBe(true);
  });

  it("keeps matches where the gamertag, provider id, or declared identifier appears", async () => {
    const byName = match({
      externalMatchId: "name-match",
      occurredAt: "2026-08-10T12:00:00.000Z",
      players: [playerStats({ displayName: "Davos282", externalPlayerId: "999" })],
    });
    const byProviderId = match({
      externalMatchId: "id-match",
      occurredAt: "2026-08-11T12:00:00.000Z",
      players: [playerStats({ displayName: "Other", externalPlayerId: "922546779" })],
    });
    const byIdentifier = match({
      externalMatchId: "identifier-match",
      occurredAt: "2026-08-09T12:00:00.000Z",
      players: [playerStats({ displayName: "Other", externalPlayerId: "davos282" })],
    });

    const provider = recordingProvider({
      friendlyMatch: [byName],
      leagueMatch: [byProviderId],
      playoffMatch: [byIdentifier],
    });
    const useCase = new ListPlayerRecentProviderMatchesUseCase(registryOf(provider));

    const result = await useCase.execute({
      accounts: [
        account({
          identifier: "davos282",
          normalizedIdentifier: "davos282",
          providerExternalPlayerId: "922546779",
        }),
      ],
      clubs: [club()],
    });

    expect(result.isOk() && result.value.status).toBe("ready");
    if (!result.isOk() || result.value.status !== "ready") return;
    expect(result.value.matches.map((row) => row.match.provider.externalMatchId)).toEqual([
      "id-match",
      "name-match",
      "identifier-match",
    ]);
    expect(result.value.matches[0]?.kind).toBe("played");
    if (result.value.matches[0]?.kind !== "played") return;
    expect(result.value.matches[0].appearance.externalPlayerId).toBe("922546779");
  });

  it("dedupes by external match id and keeps the latest occurrence", async () => {
    const older = match({
      externalMatchId: "same",
      occurredAt: "2026-08-01T00:00:00.000Z",
      players: [playerStats({ displayName: "davos282" })],
    });
    const newer = match({
      externalMatchId: "same",
      occurredAt: "2026-08-08T00:00:00.000Z",
      players: [playerStats({ displayName: "davos282", goals: 2 })],
    });
    const provider = recordingProvider({
      friendlyMatch: [older],
      leagueMatch: [newer],
      playoffMatch: [],
    });
    const useCase = new ListPlayerRecentProviderMatchesUseCase(registryOf(provider));

    const result = await useCase.execute({
      accounts: [account({ identifier: "davos282", normalizedIdentifier: "davos282" })],
      clubs: [club()],
    });

    expect(result.isOk() && result.value.status).toBe("ready");
    if (!result.isOk() || result.value.status !== "ready") return;
    expect(result.value.matches).toHaveLength(1);
    expect(result.value.matches[0]?.match.occurredAt.toISOString()).toBe(
      "2026-08-08T00:00:00.000Z",
    );
    expect(result.value.matches[0]?.kind).toBe("played");
    if (result.value.matches[0]?.kind !== "played") return;
    expect(result.value.matches[0].appearance.goals).toBe(2);
  });

  it("keeps appearances from match types that succeed when another type fails", async () => {
    const appearance = match({
      externalMatchId: "friendly-1",
      occurredAt: "2026-08-10T12:00:00.000Z",
      players: [playerStats({ displayName: "davos282", externalPlayerId: "davos282" })],
    });
    const failure = new ProviderUnavailable({
      code: "game_data.provider_unavailable",
      message: "playoffs down",
      retryAfterSeconds: 30,
    });
    const provider = recordingProvider({
      friendlyMatch: [appearance],
      failTypes: { playoffMatch: failure },
    });
    const useCase = new ListPlayerRecentProviderMatchesUseCase(registryOf(provider));

    const result = await useCase.execute({
      accounts: [account({ identifier: "davos282", normalizedIdentifier: "davos282" })],
      clubs: [club()],
    });

    expect(result.isOk()).toBe(true);
    if (!result.isOk() || result.value.status !== "ready") return;
    expect(result.value.matches).toHaveLength(1);
    expect(result.value.matches[0]?.match.provider.externalMatchId).toBe("friendly-1");
  });

  it("propagates a provider failure without partial matches", async () => {
    const failure = new ProviderUnavailable({
      code: "game_data.provider_unavailable",
      message: "EA down",
      retryAfterSeconds: 30,
    });
    const provider = recordingProvider({
      failWith: failure,
    });
    const useCase = new ListPlayerRecentProviderMatchesUseCase(registryOf(provider));

    const result = await useCase.execute({
      accounts: [account({ identifier: "davos282", normalizedIdentifier: "davos282" })],
      clubs: [club()],
    });

    expect(result.isOk()).toBe(false);
    if (result.isOk()) return;
    expect(result.error).toBe(failure);
  });

  it("caps the ready list at 50 appearances, newest first", async () => {
    const many = Array.from({ length: 51 }, (_, index) =>
      match({
        externalMatchId: `match-${String(index)}`,
        occurredAt: new Date(Date.UTC(2026, 7, 1, index)).toISOString(),
        players: [playerStats({ displayName: "davos282", externalPlayerId: "davos282" })],
      }),
    );
    const provider = recordingProvider({ friendlyMatch: many });
    const useCase = new ListPlayerRecentProviderMatchesUseCase(registryOf(provider));

    const result = await useCase.execute({
      accounts: [account({ identifier: "davos282", normalizedIdentifier: "davos282" })],
      clubs: [club()],
    });

    expect(result.isOk()).toBe(true);
    if (!result.isOk() || result.value.status !== "ready") return;
    expect(result.value.matches).toHaveLength(50);
    expect(result.value.matches[0]?.match.provider.externalMatchId).toBe("match-50");
    expect(result.value.matches.at(-1)?.match.provider.externalMatchId).toBe("match-1");
  });

  it("classifies an appearance for the fetched club as played", async () => {
    const provider = recordingProvider({
      friendlyMatch: [
        match({
          players: [playerStats({ displayName: "davos282", externalClubId: "10754", goals: 1 })],
        }),
      ],
    });
    const useCase = new ListPlayerRecentProviderMatchesUseCase(registryOf(provider));

    const result = await useCase.execute({
      accounts: [account({ identifier: "davos282", normalizedIdentifier: "davos282" })],
      clubs: [club()],
    });

    expect(result.isOk() && result.value.status).toBe("ready");
    if (!result.isOk() || result.value.status !== "ready") return;
    expect(result.value.matches).toEqual([
      expect.objectContaining({
        kind: "played",
        listedExternalClubId: "10754",
        appearance: expect.objectContaining({ externalClubId: "10754", goals: 1 }),
      }),
    ]);
  });

  it("classifies club matches without a player roster row as not_played", async () => {
    const provider = recordingProvider({
      friendlyMatch: [
        match({
          externalMatchId: "sat-out",
          players: [playerStats({ displayName: "Rival", externalPlayerId: "111" })],
        }),
      ],
    });
    const useCase = new ListPlayerRecentProviderMatchesUseCase(registryOf(provider));

    const result = await useCase.execute({
      accounts: [account({ identifier: "davos282", normalizedIdentifier: "davos282" })],
      clubs: [club()],
    });

    expect(result.isOk() && result.value.status).toBe("ready");
    if (!result.isOk() || result.value.status !== "ready") return;
    expect(result.value.matches).toEqual([
      expect.objectContaining({
        kind: "not_played",
        listedExternalClubId: "10754",
        match: expect.objectContaining({
          provider: expect.objectContaining({ externalMatchId: "sat-out" }),
        }),
      }),
    ]);
    expect(result.value.matches[0]).not.toHaveProperty("appearance");
  });

  it("classifies an appearance for the opponent of the fetched club as not_played", async () => {
    const provider = recordingProvider({
      friendlyMatch: [
        match({
          players: [playerStats({ displayName: "davos282", externalClubId: "2", goals: 3 })],
        }),
      ],
    });
    const useCase = new ListPlayerRecentProviderMatchesUseCase(registryOf(provider));

    const result = await useCase.execute({
      accounts: [account({ identifier: "davos282", normalizedIdentifier: "davos282" })],
      clubs: [club()],
    });

    expect(result.isOk() && result.value.status).toBe("ready");
    if (!result.isOk() || result.value.status !== "ready") return;
    expect(result.value.matches).toHaveLength(1);
    expect(result.value.matches[0]).toEqual(
      expect.objectContaining({
        kind: "not_played",
        listedExternalClubId: "10754",
      }),
    );
    expect(result.value.matches[0]).not.toHaveProperty("appearance");
  });

  it("prefers played over not_played when the same match is fetched from both clubs", async () => {
    const shared = match({
      externalMatchId: "shared",
      players: [playerStats({ displayName: "davos282", externalClubId: "2" })],
    });
    const accounts = [account({ identifier: "davos282", normalizedIdentifier: "davos282" })];
    const listed = club({ externalClubId: "10754" });
    const linedUp = club({ externalClubId: "2" });

    for (const clubs of [
      [listed, linedUp],
      [linedUp, listed],
    ]) {
      const useCase = new ListPlayerRecentProviderMatchesUseCase(
        registryOf(recordingProvider({ friendlyMatch: [shared] })),
      );
      const result = await useCase.execute({ accounts, clubs });
      expect(result.isOk() && result.value.status).toBe("ready");
      if (!result.isOk() || result.value.status !== "ready") return;
      expect(result.value.matches).toHaveLength(1);
      expect(result.value.matches[0]?.kind).toBe("played");
      if (result.value.matches[0]?.kind !== "played") return;
      expect(result.value.matches[0].appearance.externalClubId).toBe("2");
      expect(result.value.matches[0].listedExternalClubId).toBe("2");
    }
  });

  it("prefers the listed-club appearance when the opponent roster is scanned first", async () => {
    const provider = recordingProvider({
      friendlyMatch: [
        match({
          players: [
            playerStats({ displayName: "davos282", externalClubId: "2", goals: 3 }),
            playerStats({ displayName: "davos282", externalClubId: "10754", goals: 1 }),
          ],
        }),
      ],
    });
    const useCase = new ListPlayerRecentProviderMatchesUseCase(registryOf(provider));

    const result = await useCase.execute({
      accounts: [account({ identifier: "davos282", normalizedIdentifier: "davos282" })],
      clubs: [club()],
    });

    expect(result.isOk() && result.value.status).toBe("ready");
    if (!result.isOk() || result.value.status !== "ready") return;
    expect(result.value.matches).toHaveLength(1);
    expect(result.value.matches[0]?.kind).toBe("played");
    if (result.value.matches[0]?.kind !== "played") return;
    expect(result.value.matches[0].listedExternalClubId).toBe("10754");
    expect(result.value.matches[0].appearance).toEqual(
      expect.objectContaining({ externalClubId: "10754", goals: 1 }),
    );
  });
});

function recordingProvider(
  options: {
    readonly friendlyMatch?: readonly ProviderMatch[];
    readonly leagueMatch?: readonly ProviderMatch[];
    readonly playoffMatch?: readonly ProviderMatch[];
    readonly failWith?: ProviderUnavailable;
    readonly failTypes?: Readonly<Partial<Record<string, ProviderUnavailable>>>;
  } = {},
) {
  const calls: Array<{
    readonly externalClubId: string;
    readonly platform: string;
    readonly gameEdition: string;
    readonly matchType: string;
    readonly maxResultCount: number;
  }> = [];
  const byType = {
    friendlyMatch: options.friendlyMatch ?? [],
    leagueMatch: options.leagueMatch ?? [],
    playoffMatch: options.playoffMatch ?? [],
  } satisfies Record<string, readonly ProviderMatch[]>;

  const provider: GameDataProviderPort & { readonly calls: typeof calls } = {
    key: "ea-clubs",
    capabilities: {
      searchClubs: true,
      getClubInfo: true,
      getRecentMatches: true,
      getPlayerStats: false,
      getTeamStats: false,
    },
    searchClubs: async () => ok([]),
    getClubInfo: async () => {
      throw new Error("unused");
    },
    getRecentMatches: async (input) => {
      calls.push(input);
      const typedFailure = options.failTypes?.[input.matchType];
      if (typedFailure) return err(typedFailure);
      if (options.failWith) return err(options.failWith);
      const matches =
        input.matchType === "friendlyMatch"
          ? byType.friendlyMatch
          : input.matchType === "leagueMatch"
            ? byType.leagueMatch
            : input.matchType === "playoffMatch"
              ? byType.playoffMatch
              : [];
      return ok([...matches]);
    },
    calls,
  };
  return provider;
}

function registryOf(provider: GameDataProviderPort): GameDataProviderRegistryPort {
  return {
    get: () => provider,
    findSupporting: () => [provider],
    list: () => [provider],
  };
}

function club(
  input: {
    readonly externalClubId?: string;
    readonly platform?: string;
    readonly gameEdition?: string;
  } = {},
) {
  return {
    providerKey: "ea-clubs" as const,
    externalClubId: input.externalClubId ?? "10754",
    platform: input.platform ?? "common-gen5",
    gameEdition: input.gameEdition ?? "fc26",
  };
}

function account(input: {
  readonly identifier: string;
  readonly normalizedIdentifier: string;
  readonly providerExternalPlayerId?: string | null;
}) {
  return {
    identifier: input.identifier,
    normalizedIdentifier: input.normalizedIdentifier,
    providerExternalPlayerId: input.providerExternalPlayerId ?? null,
  };
}

function match(input: {
  readonly externalMatchId?: string;
  readonly occurredAt?: string;
  readonly players: readonly ProviderPlayerMatchStats[];
}): ProviderMatch {
  return {
    id: `ea-clubs:${input.externalMatchId ?? "1"}`,
    provider: { key: "ea-clubs", externalMatchId: input.externalMatchId ?? "1" },
    game: { edition: "fc26", platform: "common-gen5", mode: "friendlyMatch" },
    occurredAt: new Date(input.occurredAt ?? "2026-08-01T00:00:00.000Z"),
    home: { externalClubId: "10754", name: "Home", goals: 1, imageUrl: null },
    away: { externalClubId: "2", name: "Away", goals: 0, imageUrl: null },
    players: input.players,
    metadata: {
      durationSeconds: 540,
      wasDisconnected: false,
      winnerByForfeit: false,
      completeness: "complete",
    },
  };
}

function playerStats(
  input: Partial<ProviderPlayerMatchStats> & { readonly displayName: string },
): ProviderPlayerMatchStats {
  return {
    externalPlayerId: input.externalPlayerId ?? "0",
    displayName: input.displayName,
    externalClubId: input.externalClubId ?? "10754",
    position: input.position ?? "midfielder",
    minutesPlayed: input.minutesPlayed ?? 90,
    goals: input.goals ?? 0,
    assists: input.assists ?? 0,
    shots: input.shots ?? 0,
    passAttempts: input.passAttempts ?? 0,
    passesMade: input.passesMade ?? 0,
    tackleAttempts: input.tackleAttempts ?? 0,
    tacklesMade: input.tacklesMade ?? 0,
    saves: input.saves ?? 0,
    yellowCards: input.yellowCards ?? 0,
    redCards: input.redCards ?? 0,
    isMvp: input.isMvp ?? false,
    rating: input.rating ?? 7,
  };
}
