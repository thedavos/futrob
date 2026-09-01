import { describe, expect, it } from "vite-plus/test";
import { ok } from "@futrob/shared-kernel";
import type {
  ProviderMatch,
  ProviderPlayerMatchStats,
} from "../../domain/entities/provider-match.ts";
import type { GameDataProviderPort } from "../../domain/ports/game-data-provider.port.ts";
import type { GameDataProviderRegistryPort } from "../../domain/ports/game-data-provider-registry.port.ts";
import { GetPlayerGameProfileUseCase } from "./get-player-game-profile.use-case.ts";

describe("GetPlayerGameProfileUseCase", () => {
  it("returns needs_club without calling the provider", async () => {
    const provider = recordingProvider();
    const result = await new GetPlayerGameProfileUseCase(registryOf(provider)).execute({
      accounts: [account()],
      clubs: [],
    });

    expect(result).toEqual(ok({ status: "needs_club" }));
    expect(provider.calls).toEqual([]);
  });

  it("returns needs_game_account without calling the provider", async () => {
    const provider = recordingProvider();
    const result = await new GetPlayerGameProfileUseCase(registryOf(provider)).execute({
      accounts: [],
      clubs: [club()],
    });

    expect(result).toEqual(ok({ status: "needs_game_account" }));
    expect(provider.calls).toEqual([]);
  });

  it("builds a ready profile from played appearances", async () => {
    const provider = recordingProvider({
      leagueMatch: [
        match({
          players: [
            playerStats({
              displayName: "Davos282",
              externalPlayerId: "player-1",
              goals: 1,
              rating: 6.6,
              position: "forward",
            }),
          ],
        }),
      ],
    });
    const result = await new GetPlayerGameProfileUseCase(registryOf(provider)).execute({
      accounts: [account()],
      clubs: [club()],
    });

    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.status).toBe("ready");
    if (result.value.status !== "ready") return;
    expect(result.value.profile.sampleSize).toBe(1);
    expect(result.value.profile.identity.displayName).toBe("Davos282");
    expect(result.value.profile.identity.preferredPosition).toBe("forward");
    expect(result.value.profile.summary.totals.goals).toBe(1);
    expect(result.value.profile.attributes).toHaveLength(5);
    expect(result.value.profile.byTeam[0]?.clubName).toBe("Home");
    expect(result.value.profile.byPosition[0]?.position).toBe("forward");
  });

  it("keeps a match on the inclusive from bound and drops the exclusive to bound", async () => {
    const provider = recordingProvider({
      leagueMatch: [
        match({
          occurredAt: new Date("2026-08-25T05:00:00.000Z"),
          players: [
            playerStats({ displayName: "Davos282", externalPlayerId: "player-1", goals: 2 }),
          ],
        }),
        match({
          occurredAt: new Date("2026-09-01T05:00:00.000Z"),
          externalMatchId: "2",
          players: [
            playerStats({ displayName: "Davos282", externalPlayerId: "player-1", goals: 4 }),
          ],
        }),
      ],
    });
    const result = await new GetPlayerGameProfileUseCase(registryOf(provider)).execute({
      accounts: [account()],
      clubs: [club()],
      period: {
        from: new Date("2026-08-25T05:00:00.000Z"),
        to: new Date("2026-09-01T05:00:00.000Z"),
      },
    });

    expect(result.isOk()).toBe(true);
    if (!result.isOk() || result.value.status !== "ready") return;
    expect(result.value.profile.sampleSize).toBe(1);
    expect(result.value.profile.summary.totals.goals).toBe(2);
    expect(result.value.profile.evolution).toEqual([
      { occurredAt: new Date("2026-08-25T05:00:00.000Z"), rating: 7, outcome: "win" },
    ]);
  });

  it("returns a ready empty profile when the period has no appearances", async () => {
    const provider = recordingProvider({
      leagueMatch: [
        match({
          players: [playerStats({ displayName: "Davos282", externalPlayerId: "player-1" })],
        }),
      ],
    });
    const result = await new GetPlayerGameProfileUseCase(registryOf(provider)).execute({
      accounts: [account()],
      clubs: [club()],
      period: {
        from: new Date("2026-08-10T00:00:00.000Z"),
        to: new Date("2026-08-17T00:00:00.000Z"),
      },
    });

    expect(result.isOk()).toBe(true);
    if (!result.isOk() || result.value.status !== "ready") return;
    expect(result.value.profile.sampleSize).toBe(0);
    expect(result.value.profile.identity.displayName).toBe("Davos282");
  });
});

function recordingProvider(
  options: {
    readonly friendlyMatch?: readonly ProviderMatch[];
    readonly leagueMatch?: readonly ProviderMatch[];
    readonly playoffMatch?: readonly ProviderMatch[];
  } = {},
) {
  const calls: Array<{ readonly matchType: string }> = [];
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
      calls.push({ matchType: input.matchType });
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
  readonly players: readonly ProviderPlayerMatchStats[];
  readonly occurredAt?: Date;
  readonly externalMatchId?: string;
}): ProviderMatch {
  const externalMatchId = input.externalMatchId ?? "1";
  return {
    id: `ea-clubs:${externalMatchId}`,
    provider: { key: "ea-clubs", externalMatchId },
    game: { edition: "fc26", platform: "common-gen5", mode: "leagueMatch" },
    occurredAt: input.occurredAt ?? new Date("2026-08-01T00:00:00.000Z"),
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
