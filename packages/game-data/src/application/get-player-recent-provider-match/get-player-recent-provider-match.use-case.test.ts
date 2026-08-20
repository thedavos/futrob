import { describe, expect, it } from "vite-plus/test";
import { err, ok } from "@futrob/shared-kernel";
import type {
  ProviderMatch,
  ProviderPlayerMatchStats,
} from "../../domain/entities/provider-match.ts";
import { ProviderUnavailable } from "../../domain/errors/provider.errors.ts";
import type { GameDataProviderPort } from "../../domain/ports/game-data-provider.port.ts";
import type { GameDataProviderRegistryPort } from "../../domain/ports/game-data-provider-registry.port.ts";
import { GetPlayerRecentProviderMatchUseCase } from "./get-player-recent-provider-match.use-case.ts";

describe("GetPlayerRecentProviderMatchUseCase", () => {
  it("returns prerequisite states before loading the provider window", async () => {
    const provider = recordingProvider();
    const useCase = new GetPlayerRecentProviderMatchUseCase(registryOf(provider));

    const needsClub = await useCase.execute({
      accounts: [account()],
      club: null,
      providerKey: "ea-clubs",
      externalMatchId: "target",
    });
    const needsAccount = await useCase.execute({
      accounts: [],
      club: club(),
      providerKey: "ea-clubs",
      externalMatchId: "target",
    });

    expect(needsClub).toEqual(ok({ status: "needs_club" }));
    expect(needsAccount).toEqual(ok({ status: "needs_game_account" }));
    expect(provider.calls).toBe(0);
  });

  it("finds by provider key and external match id and keeps the full roster", async () => {
    const target = match({
      externalMatchId: "target",
      players: [
        playerStats({ displayName: "Davos282", externalPlayerId: "player-1", goals: 2 }),
        playerStats({ displayName: "Teammate", externalPlayerId: "player-2", assists: 1 }),
        playerStats({
          displayName: "Opponent",
          externalPlayerId: "player-3",
          externalClubId: "2",
        }),
      ],
    });
    const useCase = new GetPlayerRecentProviderMatchUseCase(
      registryOf(recordingProvider({ friendlyMatch: [target] })),
    );

    const result = await useCase.execute({
      accounts: [account()],
      club: club(),
      providerKey: "ea-clubs",
      externalMatchId: "target",
    });

    expect(result.isOk()).toBe(true);
    if (!result.isOk() || result.value.status !== "ready") return;
    expect(result.value.match.kind).toBe("played");
    expect(result.value.match.match.players.map((player) => player.displayName)).toEqual([
      "Davos282",
      "Teammate",
      "Opponent",
    ]);
  });

  it("returns not_played without an appearance when the player sat out", async () => {
    const target = match({
      externalMatchId: "sat-out",
      players: [
        playerStats({ displayName: "Teammate", externalPlayerId: "player-2" }),
        playerStats({
          displayName: "Opponent",
          externalPlayerId: "player-3",
          externalClubId: "2",
        }),
      ],
    });
    const useCase = new GetPlayerRecentProviderMatchUseCase(
      registryOf(recordingProvider({ friendlyMatch: [target] })),
    );

    const result = await useCase.execute({
      accounts: [account()],
      club: club(),
      providerKey: "ea-clubs",
      externalMatchId: "sat-out",
    });

    expect(result.isOk()).toBe(true);
    if (!result.isOk() || result.value.status !== "ready") return;
    expect(result.value.match.kind).toBe("not_played");
    expect(result.value.match).not.toHaveProperty("appearance");
  });

  it("returns not_found when the composite identity is absent from a complete window", async () => {
    const useCase = new GetPlayerRecentProviderMatchUseCase(
      registryOf(
        recordingProvider({
          friendlyMatch: [match({ externalMatchId: "other", players: [] })],
        }),
      ),
    );

    const result = await useCase.execute({
      accounts: [account()],
      club: club(),
      providerKey: "ea-clubs",
      externalMatchId: "target",
    });

    expect(result).toEqual(ok({ status: "not_found" }));
  });

  it("searches only the final 50-result window", async () => {
    const matches = Array.from({ length: 51 }, (_, index) =>
      match({
        externalMatchId: index === 0 ? "target" : `match-${String(index)}`,
        occurredAt: new Date(Date.UTC(2026, 7, 1, index)).toISOString(),
        players: [],
      }),
    );
    const useCase = new GetPlayerRecentProviderMatchUseCase(
      registryOf(recordingProvider({ friendlyMatch: matches })),
    );

    const result = await useCase.execute({
      accounts: [account()],
      club: club(),
      providerKey: "ea-clubs",
      externalMatchId: "target",
    });

    expect(result).toEqual(ok({ status: "not_found" }));
  });

  it("propagates the provider failure when an absent match could be in a partial window", async () => {
    const failure = new ProviderUnavailable({
      code: "game_data.provider_unavailable",
      message: "playoffs down",
      retryAfterSeconds: 30,
    });
    const useCase = new GetPlayerRecentProviderMatchUseCase(
      registryOf(
        recordingProvider({
          friendlyMatch: [match({ externalMatchId: "other", players: [] })],
          failTypes: { playoffMatch: failure },
        }),
      ),
    );

    const result = await useCase.execute({
      accounts: [account()],
      club: club(),
      providerKey: "ea-clubs",
      externalMatchId: "target",
    });

    expect(result.isOk()).toBe(false);
    if (result.isOk()) return;
    expect(result.error).toBe(failure);
  });

  it("returns not_found for an unregistered provider without throwing", async () => {
    const provider = recordingProvider();
    const useCase = new GetPlayerRecentProviderMatchUseCase(registryOf(provider));

    const result = await useCase.execute({
      accounts: [account()],
      club: {
        providerKey: "screenshot-ocr",
        externalClubId: "10754",
        platform: "common-gen5",
        gameEdition: "fc26",
      },
      providerKey: "screenshot-ocr",
      externalMatchId: "target",
    });

    expect(result).toEqual(ok({ status: "not_found" }));
    expect(provider.calls).toBe(0);
  });
});

function recordingProvider(
  options: {
    readonly friendlyMatch?: readonly ProviderMatch[];
    readonly leagueMatch?: readonly ProviderMatch[];
    readonly playoffMatch?: readonly ProviderMatch[];
    readonly failTypes?: Readonly<Partial<Record<string, ProviderUnavailable>>>;
  } = {},
): GameDataProviderPort & { calls: number } {
  return {
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
    getRecentMatches: async function (input) {
      this.calls += 1;
      const failure = options.failTypes?.[input.matchType];
      if (failure) return err(failure);
      switch (input.matchType) {
        case "friendlyMatch":
          return ok([...(options.friendlyMatch ?? [])]);
        case "leagueMatch":
          return ok([...(options.leagueMatch ?? [])]);
        case "playoffMatch":
          return ok([...(options.playoffMatch ?? [])]);
        default:
          return ok([]);
      }
    },
    calls: 0,
  };
}

function registryOf(provider: GameDataProviderPort): GameDataProviderRegistryPort {
  return {
    get: (key) => {
      if (key !== provider.key) throw new Error(`Provider not registered: ${key}`);
      return provider;
    },
    findSupporting: () => [provider],
    list: () => [provider],
  };
}

function club() {
  return {
    providerKey: "ea-clubs" as const,
    externalClubId: "10754",
    platform: "common-gen5",
    gameEdition: "fc26",
  };
}

function account() {
  return {
    identifier: "Davos282",
    normalizedIdentifier: "davos282",
    providerExternalPlayerId: "player-1",
  };
}

function match(input: {
  readonly externalMatchId: string;
  readonly occurredAt?: string;
  readonly players: readonly ProviderPlayerMatchStats[];
}): ProviderMatch {
  return {
    id: `ea-clubs:${input.externalMatchId}`,
    provider: { key: "ea-clubs", externalMatchId: input.externalMatchId },
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
