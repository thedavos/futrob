import { describe, expect, it } from "vite-plus/test";
import { err, ok } from "@futrob/shared-kernel";
import type {
  ProviderMatch,
  ProviderPlayerMatchStats,
} from "../../domain/entities/provider-match.ts";
import { ProviderUnavailable } from "../../domain/errors/provider.errors.ts";
import type { GameDataProviderPort } from "../../domain/ports/game-data-provider.port.ts";
import type { GameDataProviderRegistryPort } from "../../domain/ports/game-data-provider-registry.port.ts";
import { PlayerRecentMatchWindowLoader } from "./player-recent-match-window.ts";

describe("PlayerRecentMatchWindowLoader", () => {
  it("returns a complete, classified, deduplicated final window capped at 50", async () => {
    const matches = Array.from({ length: 51 }, (_, index) =>
      match({
        externalMatchId: `match-${String(index)}`,
        occurredAt: new Date(Date.UTC(2026, 7, 1, index)).toISOString(),
        players: [
          playerStats({
            displayName: index === 50 ? "Davos282" : "Other",
            externalPlayerId: index === 50 ? "player-1" : `other-${String(index)}`,
          }),
        ],
      }),
    );
    const duplicate = match({
      externalMatchId: "match-50",
      occurredAt: "2026-08-01T00:00:00.000Z",
      players: [playerStats({ displayName: "Other", externalPlayerId: "other" })],
    });
    const provider = recordingProvider({
      friendlyMatch: matches,
      leagueMatch: [duplicate],
    });

    const result = await new PlayerRecentMatchWindowLoader(registryOf(provider)).load({
      accounts: [
        {
          identifier: "Davos282",
          normalizedIdentifier: "davos282",
          providerExternalPlayerId: "player-1",
        },
      ],
      clubs: [club()],
    });

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.coverage).toBe("complete");
    expect(result.value.matches).toHaveLength(50);
    expect(result.value.matches[0]).toEqual(
      expect.objectContaining({
        kind: "played",
        listedExternalClubId: "10754",
        match: expect.objectContaining({
          provider: expect.objectContaining({ externalMatchId: "match-50" }),
        }),
      }),
    );
    expect(result.value.matches.at(-1)?.match.provider.externalMatchId).toBe("match-1");
  });

  it("returns partial coverage with the provider failure when any populated request succeeds", async () => {
    const failure = providerFailure();
    const provider = recordingProvider({
      friendlyMatch: [
        match({
          externalMatchId: "visible",
          players: [playerStats({ displayName: "Davos282", externalPlayerId: "player-1" })],
        }),
      ],
      failTypes: { playoffMatch: failure },
    });

    const result = await new PlayerRecentMatchWindowLoader(registryOf(provider)).load({
      accounts: [
        {
          identifier: "Davos282",
          normalizedIdentifier: "davos282",
          providerExternalPlayerId: "player-1",
        },
      ],
      clubs: [club()],
    });

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.coverage).toBe("partial");
    if (result.value.coverage !== "partial") return;
    expect(result.value.matches).toEqual([expect.objectContaining({ kind: "played" })]);
    expect(result.value.error).toBe(failure);
  });

  it("propagates the provider failure when no request returns a match", async () => {
    const failure = providerFailure();
    const provider = recordingProvider({
      failTypes: { playoffMatch: failure },
    });

    const result = await new PlayerRecentMatchWindowLoader(registryOf(provider)).load({
      accounts: [],
      clubs: [club()],
    });

    expect(result.isOk()).toBe(false);
    if (result.isOk()) return;
    expect(result.error).toBe(failure);
  });

  it("excludes provider observations that do not contain the requested club", async () => {
    const unrelated = match({
      externalMatchId: "unrelated",
      players: [playerStats({ displayName: "Other", externalClubId: "3" })],
      homeExternalClubId: "3",
      awayExternalClubId: "4",
    });
    const provider = recordingProvider({ friendlyMatch: [unrelated] });

    const result = await new PlayerRecentMatchWindowLoader(registryOf(provider)).load({
      accounts: [],
      clubs: [club()],
    });

    expect(result).toEqual(ok({ coverage: "complete", matches: [] }));
  });

  it("skips unregistered provider keys without throwing", async () => {
    const provider = recordingProvider({
      friendlyMatch: [
        match({
          externalMatchId: "visible",
          players: [playerStats({ displayName: "Davos282", externalPlayerId: "player-1" })],
        }),
      ],
    });

    const result = await new PlayerRecentMatchWindowLoader(throwingRegistry(provider)).load({
      accounts: [
        {
          identifier: "Davos282",
          normalizedIdentifier: "davos282",
          providerExternalPlayerId: "player-1",
        },
      ],
      clubs: [
        {
          providerKey: "screenshot-ocr",
          externalClubId: "10754",
          platform: "common-gen5",
          gameEdition: "fc26",
        },
      ],
    });

    expect(result).toEqual(ok({ coverage: "complete", matches: [] }));
  });
});

function providerFailure(): ProviderUnavailable {
  return new ProviderUnavailable({
    code: "game_data.provider_unavailable",
    message: "playoffs down",
    retryAfterSeconds: 30,
  });
}

function recordingProvider(
  options: {
    readonly friendlyMatch?: readonly ProviderMatch[];
    readonly leagueMatch?: readonly ProviderMatch[];
    readonly playoffMatch?: readonly ProviderMatch[];
    readonly failTypes?: Readonly<Partial<Record<string, ProviderUnavailable>>>;
  } = {},
): GameDataProviderPort {
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
    getRecentMatches: async (input) => {
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
  };
}

function registryOf(provider: GameDataProviderPort): GameDataProviderRegistryPort {
  return throwingRegistry(provider);
}

function throwingRegistry(provider: GameDataProviderPort): GameDataProviderRegistryPort {
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

function match(input: {
  readonly externalMatchId: string;
  readonly occurredAt?: string;
  readonly players: readonly ProviderPlayerMatchStats[];
  readonly homeExternalClubId?: string;
  readonly awayExternalClubId?: string;
}): ProviderMatch {
  return {
    id: `ea-clubs:${input.externalMatchId}`,
    provider: { key: "ea-clubs", externalMatchId: input.externalMatchId },
    game: { edition: "fc26", platform: "common-gen5", mode: "friendlyMatch" },
    occurredAt: new Date(input.occurredAt ?? "2026-08-01T00:00:00.000Z"),
    home: {
      externalClubId: input.homeExternalClubId ?? "10754",
      name: "Home",
      goals: 1,
      imageUrl: null,
    },
    away: {
      externalClubId: input.awayExternalClubId ?? "2",
      name: "Away",
      goals: 0,
      imageUrl: null,
    },
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
