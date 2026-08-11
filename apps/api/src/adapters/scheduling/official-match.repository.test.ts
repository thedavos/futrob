import type { OfficialMatch } from "@futrob/scheduling";
import {
  asCompetitionId,
  asEncounterId,
  asOfficialMatchSlotId,
  asOrganizationId,
} from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { InMemoryOfficialMatchRepository } from "./official-match.repository.ts";

const original: OfficialMatch = {
  id: asOfficialMatchSlotId("official-match-1"),
  encounterId: asEncounterId("encounter-1"),
  organizationId: asOrganizationId("org-1"),
  competitionId: asCompetitionId("competition-1"),
  slot: 1,
  status: "scheduled",
  createdAt: new Date("2026-08-11T07:00:00.000Z"),
};

describe("InMemoryOfficialMatchRepository", () => {
  it("preserves the durable row for an encounter slot on repeated upsert", async () => {
    const repository = new InMemoryOfficialMatchRepository();
    await repository.upsertMany([original]);
    await repository.upsertMany([
      {
        ...original,
        id: asOfficialMatchSlotId("replacement-id"),
        createdAt: new Date("2026-08-11T08:00:00.000Z"),
      },
    ]);

    expect(await repository.listByEncounter(original.encounterId)).toEqual([original]);
  });
});
