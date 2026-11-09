import { describe, expect, it } from "vite-plus/test";
import { InMemoryProviderMatchRepository } from "@/adapters/game-data/persistence/in-memory.repository.ts";
import {
  AWAY,
  AWAY_CAPTAIN,
  ENCOUNTER,
  HOME,
  HOME_CAPTAIN,
  ORG,
  seedComposition,
  slot,
} from "./official-selection.composition.fixture.ts";

const sync = (externalClubId: string) => ({
  organizationId: ORG,
  providerKey: "ea-clubs" as const,
  requestId: `request-${externalClubId}`,
  sync: {
    externalClubId,
    platform: "common-gen5",
    gameEdition: "fc26",
    matchType: "friendlyMatch",
    maxResultCount: 10,
  },
});

describe("official selection with the sync quota exhausted (ADR-0025)", () => {
  it("still officializes an Encounter whose candidates were already synced", async () => {
    const { modules, project } = await seedComposition({
      pool: undefined,
      matches: new InMemoryProviderMatchRepository(),
    });
    for (let index = 0; index < 60; index++) {
      expect(
        (await modules.gameData.enqueueProviderSyncJob.execute(sync(`club-${index}`))).isOk(),
      ).toBe(true);
    }
    const refused = await modules.gameData.enqueueProviderSyncJob.execute(sync("club-new"));
    expect(!refused.isOk() && refused.error.code).toBe("game_data.sync_quota_exhausted");

    const proposed = await modules.officialSelection.propose.execute({
      actorId: HOME_CAPTAIN,
      organizationId: ORG,
      encounterId: ENCOUNTER,
      actingTeamId: HOME,
      selections: slot("m-1"),
      expectedVersion: 0,
      commandKey: "propose",
    });
    if (!proposed.isOk()) throw new Error(`propose failed: ${proposed.error.code}`);
    const confirmed = await modules.officialSelection.confirm.execute({
      actorId: AWAY_CAPTAIN,
      organizationId: ORG,
      encounterId: ENCOUNTER,
      actingTeamId: AWAY,
      proposalId: proposed.value.proposal!.id,
      expectedVersion: 1,
      commandKey: "confirm",
    });

    expect(confirmed.isOk() && confirmed.value.selection.status).toBe("approved");
    expect(confirmed.isOk() && confirmed.value.approvedResult).toBeTruthy();
    expect(project).toHaveBeenCalledTimes(1);
  });
});
