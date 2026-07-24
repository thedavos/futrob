import { describe, expect, it } from "vite-plus/test";
import { ListMatchesBetweenClubsUseCase } from "./list-matches-between-clubs.use-case.ts";
import type { ProviderMatch } from "../../domain/entities/provider-match.ts";
import type { ProviderMatchRepository } from "../../domain/ports/provider-match.repository.ts";

describe("ListMatchesBetweenClubsUseCase", () => {
  it("delegates to the provider match repository", async () => {
    const matches = [{ id: "m-1" }] as unknown as ProviderMatch[];
    let received: unknown;
    const repo: ProviderMatchRepository = {
      upsertMany: async () => undefined,
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
