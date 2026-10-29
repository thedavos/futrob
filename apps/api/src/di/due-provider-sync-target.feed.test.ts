import { asFixtureStageId } from "@futrob/scheduling";
import {
  asCompetitionId,
  asEncounterId,
  asOfficialMatchSlotId,
  asOrganizationId,
  asTeamId,
} from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { InMemoryProviderSyncJobRepository } from "@/adapters/game-data/jobs/in-memory-provider-sync-job.repository.ts";
import { DUE_PROVIDER_SYNC_MATCH_TYPES } from "@/adapters/game-data/jobs/due-provider-sync-target.feed.ts";
import { InMemoryEncounterScheduleRepository } from "@/adapters/scheduling/encounter-schedule.repository.ts";
import { InMemoryOfficialMatchRepository } from "@/adapters/scheduling/official-match.repository.ts";
import { InMemoryExternalClubConnectionRepository } from "@/adapters/teams/external-club-connection.repository.ts";
import { createDueProviderSyncTargetFeed } from "./due-provider-sync-target.feed.ts";

const now = new Date("2026-10-10T20:00:00.000Z");

describe("createDueProviderSyncTargetFeed", () => {
  it("reads connected clubs on open slots of the in-memory encounter", async () => {
    const encounters = new InMemoryEncounterScheduleRepository();
    const matches = new InMemoryOfficialMatchRepository();
    const connections = new InMemoryExternalClubConnectionRepository();
    const organizationId = asOrganizationId("org-1");
    const encounterId = asEncounterId("encounter-1");
    const homeTeamId = asTeamId("team-home");
    const awayTeamId = asTeamId("team-away");
    await encounters.upsert({
      encounterId,
      organizationId,
      competitionId: asCompetitionId("competition-1"),
      stageId: asFixtureStageId("stage-1"),
      homeTeamId,
      awayTeamId,
      scheduledStartAt: now,
      officialMatchCount: 1,
    });
    await matches.upsertMany([
      {
        id: asOfficialMatchSlotId("slot-1"),
        encounterId,
        organizationId,
        competitionId: asCompetitionId("competition-1"),
        slot: 1,
        status: "awaiting_selection",
        scheduledStartAt: now,
        createdAt: now,
      },
    ]);
    await connections.upsert({
      teamId: homeTeamId,
      providerKey: "ea-clubs",
      externalClubId: "club-home",
      externalClubName: "Home",
      gameEdition: "fc26",
      platform: "common-gen5",
    });

    const targets = await createDueProviderSyncTargetFeed({
      pool: undefined,
      jobs: new InMemoryProviderSyncJobRepository(),
      encounters,
      matches,
      connections,
    }).list({ now, limit: 10, cooldownMs: 900_000 });

    expect(targets.map((target) => target.matchType)).toEqual([...DUE_PROVIDER_SYNC_MATCH_TYPES]);
    expect(targets.every((target) => target.externalClubId === "club-home")).toBe(true);
  });
});
