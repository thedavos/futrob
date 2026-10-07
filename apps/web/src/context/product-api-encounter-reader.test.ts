import { createFutrobClient } from "@futrob/sdk";
import { asEncounterId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { ProductApiEncounterReader } from "./product-api-encounter-reader.ts";

const snapshot = {
  encounterId: "encounter-1",
  organizationId: "org-1",
  competitionId: "competition-1",
  stageId: "plan-1:stage:1",
  homeTeamId: "team-home",
  awayTeamId: "team-away",
  scheduledStartAt: "2026-10-20T20:00:00.000Z",
  officialMatchCount: 2,
  homeExternalClubId: "club-home",
  awayExternalClubId: "club-away",
  providerKey: "ea-clubs",
  officialMatches: [
    { officialSlot: 1, scheduledStartAt: "2026-10-20T20:00:00.000Z" },
    { officialSlot: 2, scheduledStartAt: "2026-10-21T21:00:00.000Z" },
  ],
};

function readerReturning(response: Response) {
  return new ProductApiEncounterReader(
    createFutrobClient({
      baseUrl: "https://api.futrob.test/api/v1",
      createRequestId: () => "request-1",
      fetchImpl: async () => response,
    }),
  );
}

describe("ProductApiEncounterReader", () => {
  it("reads each slot start, including a slot 2 moved on its own", async () => {
    const read = await readerReturning(Response.json(snapshot)).getById(
      asEncounterId("encounter-1"),
    );

    expect(read?.scheduledStartAt).toEqual(new Date("2026-10-20T20:00:00.000Z"));
    expect(read?.officialMatchStarts).toEqual([
      { slot: 1, scheduledStartAt: new Date("2026-10-20T20:00:00.000Z") },
      { slot: 2, scheduledStartAt: new Date("2026-10-21T21:00:00.000Z") },
    ]);
  });

  it("returns null for an Encounter the API does not expose", async () => {
    const read = await readerReturning(
      Response.json(
        { code: "scheduling.encounter_not_found", message: "Not found" },
        { status: 404 },
      ),
    ).getById(asEncounterId("encounter-1"));

    expect(read).toBeNull();
  });
});
