import { asEncounterId, asTeamId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { InMemoryProviderMatchRepository } from "@/adapters/game-data/persistence/in-memory.repository.ts";
import { RepositoryProviderMatchReader } from "./bridges.ts";
import { InMemoryExternalClubConnectionRepository } from "@/adapters/teams/external-club-connection.repository.ts";

const query = {
  encounterId: asEncounterId("encounter-1"),
  homeTeamId: asTeamId("team-home"),
  awayTeamId: asTeamId("team-away"),
  window: {
    from: new Date("2026-09-14T02:00:00.000Z"),
    to: new Date("2026-09-15T14:00:00.000Z"),
  },
};

describe("RepositoryProviderMatchReader", () => {
  it("reports exactly which clubs are not connected", async () => {
    const connections = new InMemoryExternalClubConnectionRepository();
    await connections.upsert({
      teamId: query.homeTeamId,
      providerKey: "ea-clubs",
      externalClubId: "club-home",
      externalClubName: "Home Club",
      gameEdition: "FC 26",
      platform: "common-gen5",
    });
    const reader = new RepositoryProviderMatchReader(
      new InMemoryProviderMatchRepository(),
      connections,
    );

    await expect(reader.listCandidatesForEncounter(query)).resolves.toEqual({
      status: "clubs_not_connected",
      sides: ["away"],
    });
  });

  it("does not mix connections from different providers", async () => {
    const connections = new InMemoryExternalClubConnectionRepository();
    await connections.upsert({
      teamId: query.homeTeamId,
      providerKey: "ea-clubs",
      externalClubId: "club-home",
      externalClubName: "Home Club",
      gameEdition: "FC 26",
      platform: "common-gen5",
    });
    await connections.upsert({
      teamId: query.awayTeamId,
      providerKey: "manual",
      externalClubId: "club-away",
      externalClubName: "Away Club",
      gameEdition: "FC 26",
      platform: "common-gen5",
    });
    const reader = new RepositoryProviderMatchReader(
      new InMemoryProviderMatchRepository(),
      connections,
    );

    await expect(reader.listCandidatesForEncounter(query)).resolves.toEqual({
      status: "provider_mismatch",
    });
  });
});
