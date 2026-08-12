import type { OfficialResult } from "@futrob/results";
import {
  EditFixtureEncounterUseCase,
  generateFixturePlan,
  type OfficialMatch,
} from "@futrob/scheduling";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
} from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { InMemoryEncounterMutationLock } from "./encounter-mutation-lock.ts";
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
      {
        listByEncounter: async () => [],
        upsertMany: async () => {},
        voidByEncounterIds: async () => {},
      },
      { findApprovedByEncounter: async () => approved },
      { findLatestByEncounter: async () => null },
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
      {
        listByEncounter: async () => matches,
        upsertMany: async () => {},
        voidByEncounterIds: async () => {},
      },
      { findApprovedByEncounter: async () => null },
      { findLatestByEncounter: async () => null },
    );

    await expect(
      guard.canEdit({
        encounterId,
        organizationId: asOrganizationId("org-1"),
        competitionId: asCompetitionId("competition-1"),
      }),
    ).resolves.toBe(true);
  });

  it("serializes result approval ahead of a concurrent fixture edit", async () => {
    const organizationId = asOrganizationId("org-1");
    const competitionId = asCompetitionId("competition-1");
    const plan = generateFixturePlan({
      organizationId,
      competitionId,
      generationVersion: 1,
      rulesVersion: 1,
      format: "league",
      timeZone: "America/Lima",
      startsAt: new Date("2026-09-01T01:00:00.000Z"),
      roundIntervalDays: 7,
      officialMatchCounts: { regular: 1, knockout: 2 },
      resolutionModes: { regular: "independent_matches", knockout: "aggregate_score" },
      seed: [asTeamId("team-a"), asTeamId("team-b")],
      homeAndAway: false,
    });
    const encounter = plan.stages[0]?.rounds[0]?.encounters[0];
    expect(encounter).toBeDefined();
    if (!encounter) return;
    const lock = new InMemoryEncounterMutationLock();
    let approved = false;
    let guardChecks = 0;
    let approvalEntered!: () => void;
    let releaseApproval!: () => void;
    const entered = new Promise<void>((resolve) => {
      approvalEntered = resolve;
    });
    const release = new Promise<void>((resolve) => {
      releaseApproval = resolve;
    });
    const approval = lock.runExclusive(encounter.id, async () => {
      approvalEntered();
      await release;
      approved = true;
    });
    await entered;

    const edit = new EditFixtureEncounterUseCase({
      authorization: {
        decide: async (request) => ({ ...request, allowed: true, reason: "allowed" }),
        getEffectiveAccess: async (input) => ({ ...input, roles: [], permissions: [] }),
      },
      audit: { findByRequestId: async () => null, append: async () => {} },
      clock: { now: () => new Date() },
      editGuard: {
        canEdit: async () => {
          guardChecks += 1;
          return !approved;
        },
      },
      eventPublisher: { publish: async () => {}, publishMany: async () => {} },
      encounters: {
        findById: async () => null,
        upsert: async (snapshot) => snapshot,
        deleteByEncounterIds: async () => {},
      },
      fixtures: {
        findById: async () => plan,
        findByGenerationVersion: async () => plan,
        listActive: async () => [plan],
        save: async () => ({ plan, created: false }),
        updateEncounter: async () => plan,
        markSuperseded: async () => {},
        containsEncounter: async () => true,
      },
      matches: {
        listByEncounter: async () => [],
        upsertMany: async () => {},
        voidByEncounterIds: async () => {},
      },
      mutationLock: lock,
      source: { load: async () => null },
      transaction: { runInTransaction: async (operation) => operation() },
    }).execute({
      actorId: asActorId("staff-1"),
      organizationId,
      competitionId,
      fixturePlanId: plan.id,
      encounterId: encounter.id,
      scheduledStartAt: new Date("2026-09-02T01:00:00.000Z"),
      reason: "Concurrent edit",
      requestId: "request-concurrent-edit",
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(guardChecks).toBe(0);

    releaseApproval();
    await approval;
    const result = await edit;

    expect(result.isErr()).toBe(true);
    if (result.isOk()) return;
    expect(result.error.code).toBe("scheduling.fixture_encounter_not_editable");
    expect(guardChecks).toBe(1);
  });

  it("blocks fixture edits after an official selection is pending", async () => {
    const guard = new OfficialResultFixtureEditGuard(
      {
        listByEncounter: async () => [],
        upsertMany: async () => {},
        voidByEncounterIds: async () => {},
      },
      { findApprovedByEncounter: async () => null },
      {
        findLatestByEncounter: async () => ({
          id: "selection-1",
          encounterId,
          status: "awaiting_opponent_confirmation",
          slots: [],
          proposedByActorId: "captain-1",
          proposedAt: new Date("2026-09-01T01:30:00.000Z"),
        }),
      },
    );

    await expect(
      guard.canEdit({
        encounterId,
        organizationId: asOrganizationId("org-1"),
        competitionId: asCompetitionId("competition-1"),
      }),
    ).resolves.toBe(false);
  });
});
