import { describe, expect, it } from "vite-plus/test";
import { ListMatchesBetweenClubsUseCase } from "./list-matches-between-clubs.use-case.ts";
import type { ProviderMatch } from "../../domain/entities/provider-match.ts";
import type { ProviderMatchRepository } from "../../domain/ports/provider-match.repository.ts";

function providerMatchStub(id: string): ProviderMatch {
  return {
    id,
    provider: { key: "ea-clubs", externalMatchId: id },
    game: { edition: "fc26", platform: "common-gen5", mode: "clubs" },
    occurredAt: new Date("2026-08-07T12:00:00.000Z"),
    home: { externalClubId: "home", name: "Home", goals: 0, imageUrl: null },
    away: { externalClubId: "away", name: "Away", goals: 0, imageUrl: null },
    players: [],
    metadata: {
      durationSeconds: null,
      wasDisconnected: false,
      winnerByForfeit: false,
      completeness: "unknown",
    },
  };
}

describe("ListMatchesBetweenClubsUseCase", () => {
  it("delegates to the provider match repository", async () => {
    const matches = [providerMatchStub("m-1")];
    let received: unknown;
    const repo: ProviderMatchRepository = {
      upsertMany: async () => undefined,
      findByExternalId: async () => null,
      listBetweenClubs: async (input) => {
        received = input;
        return matches;
      },
    };

    const useCase = new ListMatchesBetweenClubsUseCase(repo);
    const input = {
      providerKey: "ea-clubs" as const,
      homeExternalClubId: "home",
      awayExternalClubId: "away",
      from: new Date("2026-01-01T00:00:00.000Z"),
      to: new Date("2026-01-31T00:00:00.000Z"),
    };

    await expect(useCase.execute(input)).resolves.toBe(matches);
    expect(received).toEqual(input);
  });
});
