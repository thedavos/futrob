import type { OfficialResult } from "@futrob/results";
import type { OfficialMatch } from "@futrob/scheduling";
import { asActorId, asCompetitionId, asEncounterId, asOrganizationId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { OfficialResultFixtureEditGuard } from "./fixture-editing.adapters.ts";

const encounterId = asEncounterId("encounter-1");

describe("OfficialResultFixtureEditGuard", () => {
  it("blocks fixture edits after an official result is approved", async () => {
    const approved: OfficialResult = {
      id: "result-1",
      encounterId,
      organizationId: asOrganizationId("org-1"),
      competitionId: asCompetitionId("competition-1"),
      revision: 1,
      status: "approved",
      slots: [],
      approvedAt: new Date("2026-09-01T02:00:00.000Z"),
      approvedBy: asActorId("organizer-1"),
    };
    const guard = new OfficialResultFixtureEditGuard(
      { listByEncounter: async () => [], upsertMany: async () => {} },
      { findApprovedByEncounter: async () => approved },
    );

    await expect(
      guard.canEdit({
        encounterId,
        organizationId: approved.organizationId,
        competitionId: approved.competitionId,
      }),
    ).resolves.toBe(false);
  });

  it("allows pending matches when no result is approved", async () => {
    const matches: OfficialMatch[] = [];
    const guard = new OfficialResultFixtureEditGuard(
      { listByEncounter: async () => matches, upsertMany: async () => {} },
      { findApprovedByEncounter: async () => null },
    );

    await expect(
      guard.canEdit({
        encounterId,
        organizationId: asOrganizationId("org-1"),
        competitionId: asCompetitionId("competition-1"),
      }),
    ).resolves.toBe(true);
  });
});
