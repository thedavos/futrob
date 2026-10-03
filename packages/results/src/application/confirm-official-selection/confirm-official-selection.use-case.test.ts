import { describe, expect, it } from "vite-plus/test";
import { ACTORS, AWAY, ENCOUNTER, createSelectionHarness } from "../selection-flow.test-support.ts";

describe("ConfirmOfficialSelectionUseCase snapshot", () => {
  it("materializes the provider data of each slot into the approved revision", async () => {
    const h = createSelectionHarness({ officialMatchCount: 2, matchIds: ["m-1", "m-2"] });
    await h.associate(ENCOUNTER, ["m-1", "m-2"]);
    const proposed = await h.propose(["m-1", "m-2"]);
    if (!proposed.isOk()) throw new Error("proposal failed");

    const confirmed = await h.useCases.confirm.execute({
      ...h.base(),
      actorId: ACTORS.awayCaptain,
      actingTeamId: AWAY,
      proposalId: proposed.value.proposal!.id,
      expectedVersion: 1,
      commandKey: "confirm-1",
    });

    expect(confirmed.isOk()).toBe(true);
    const result = confirmed.isOk() ? confirmed.value.approvedResult : null;
    expect(result?.slots).toHaveLength(2);
    expect(result?.slots[0]).toMatchObject({
      officialSlot: 1,
      providerMatchRef: { providerKey: "ea-clubs", externalId: "m-1" },
      homeGoals: 2,
      awayGoals: 1,
      homeExternalClubId: "club-home",
    });
    expect(result?.approvedAt).toEqual(h.clockState.now);
  });

  it("fails when the provider snapshot is gone and writes nothing", async () => {
    const h = createSelectionHarness({ matchIds: [] });
    await h.associate(ENCOUNTER, ["m-1"]);
    const proposed = await h.propose(["m-1"]);
    if (!proposed.isOk()) throw new Error("proposal failed");

    const confirmed = await h.useCases.confirm.execute({
      ...h.base(),
      actorId: ACTORS.awayCaptain,
      actingTeamId: AWAY,
      proposalId: proposed.value.proposal!.id,
      expectedVersion: 1,
      commandKey: "confirm-1",
    });

    expect(confirmed.isErr() && confirmed.error.code).toBe(
      "results.provider_match_snapshot_missing",
    );
    expect(h.results.rows).toHaveLength(0);
    expect((await h.selections.findLatestByEncounter(ENCOUNTER))?.status).toBe(
      "awaiting_opponent_confirmation",
    );
  });
});
