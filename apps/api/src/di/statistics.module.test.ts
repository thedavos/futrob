import { describe, expect, it } from "vite-plus/test";
import { asActorId, asCompetitionId, asEncounterId, asOrganizationId } from "@futrob/shared-kernel";
import type { OfficialResult } from "@futrob/results";
import { InMemoryOfficialResultRepository } from "@/adapters/results/official-result.repository";
import { InMemoryPlayerGameAccountRepository } from "@/adapters/teams/in-memory.repository";
import { createStatisticsModule } from "./statistics.module";

describe("statistics module event handler", () => {
  it("projects an approved result through repository bridges", async () => {
    const officialResults = new InMemoryOfficialResultRepository();
    const accounts = new InMemoryPlayerGameAccountRepository();
    accounts.rows.set("account-1", {
      id: "account-1",
      playerProfileId: "profile-1",
      identifier: "PlayerOne",
      normalizedIdentifier: "playerone",
      providerExternalPlayerId: "provider-player-1",
      platform: "playstation",
      gameEdition: "FC 26",
      createdAt: new Date("2026-08-01T00:00:00.000Z"),
    });
    const result = approvedResult();
    await officialResults.save(result);
    const statistics = createStatisticsModule({
      pool: null,
      officialResults,
      accounts,
    });

    const projected = await statistics.projectOfficialResultFromEvent({
      officialResultId: result.id,
    });

    expect(projected.isOk()).toBe(true);
    expect(await statistics.repositories.contributions.listByOfficialResult(result.id)).toEqual([
      expect.objectContaining({
        correlationStatus: "matched",
        playerProfileId: "profile-1",
        gameAccountId: "account-1",
      }),
    ]);
  });
});

function approvedResult(): OfficialResult {
  return {
    id: "result-1",
    encounterId: asEncounterId("encounter-1"),
    organizationId: asOrganizationId("organization-1"),
    competitionId: asCompetitionId("competition-1"),
    revision: 1,
    status: "approved",
    slots: [
      {
        officialSlot: 1,
        providerMatchRef: { providerKey: "ea-clubs", externalId: "match-1" },
        homeExternalClubId: "club-1",
        awayExternalClubId: "club-2",
        homeGoals: 1,
        awayGoals: 0,
        occurredAt: new Date("2026-08-10T19:00:00.000Z"),
        gameEdition: "fc26",
        platform: "playstation",
        players: [
          {
            externalPlayerId: "provider-player-1",
            displayName: "PlayerOne",
            externalClubId: "club-1",
            position: "midfielder",
            minutesPlayed: 90,
            goals: 1,
            assists: 0,
            shots: 2,
            passAttempts: 10,
            passesMade: 8,
            tackleAttempts: 3,
            tacklesMade: 2,
            saves: null,
            yellowCards: 0,
            redCards: 0,
            isMvp: false,
            rating: 8,
          },
        ],
      },
    ],
    approvedAt: new Date("2026-08-10T20:00:00.000Z"),
    approvedBy: asActorId("actor-1"),
  };
}
