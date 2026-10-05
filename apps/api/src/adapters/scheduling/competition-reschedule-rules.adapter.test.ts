import type { CompetitionDraft } from "@futrob/competitions";
import { asFixtureStageId, type FixturePlan, type ScheduleChangeRequest } from "@futrob/scheduling";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
} from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { InMemoryCompetitionRepository } from "@/adapters/competitions/in-memory.repository.ts";
import { CompetitionRescheduleRulesAdapter } from "./competition-reschedule-rules.adapter.ts";
import { InMemoryFixturePlanRepository } from "./fixture-plan.repository.ts";
import { InMemoryScheduleChangeRequestRepository } from "./schedule-change-request.repository.ts";

const organizationId = asOrganizationId("org-1");
const competitionId = asCompetitionId("competition-1");
const encounterId = asEncounterId("encounter-1");
const teamId = asTeamId("team-home");
const regularStageId = asFixtureStageId("plan-1:stage:1");
const knockoutStageId = asFixtureStageId("plan-1:stage:2");

function stageRules(input: {
  readonly allowRescheduling: boolean;
  readonly maxReschedulesPerTeam: number | null;
  readonly minimumRescheduleNoticeHours?: number;
  readonly rescheduleRequiresOpponentApproval?: boolean;
  readonly rescheduleRequiresOrganizerApproval?: boolean;
}) {
  return {
    officialMatchesPerEncounter: 1 as const,
    resolutionMode: "independent_matches" as const,
    winPoints: 3,
    drawPoints: 1,
    lossPoints: 0,
    allowRescheduling: input.allowRescheduling,
    maxReschedulesPerTeam: input.maxReschedulesPerTeam,
    minimumRescheduleNoticeHours: input.minimumRescheduleNoticeHours ?? 12,
    rescheduleRequiresOpponentApproval: input.rescheduleRequiresOpponentApproval ?? true,
    rescheduleRequiresOrganizerApproval: input.rescheduleRequiresOrganizerApproval ?? false,
  };
}

function draft(overrides?: {
  readonly allowRescheduling?: boolean;
  readonly maxReschedulesPerTeam?: number | null;
  readonly knockoutOnly?: boolean;
  readonly mixed?: {
    readonly regular: {
      readonly allowRescheduling: boolean;
      readonly maxReschedulesPerTeam: number;
    };
    readonly knockout: {
      readonly allowRescheduling: boolean;
      readonly maxReschedulesPerTeam: number;
      readonly minimumRescheduleNoticeHours?: number;
      readonly rescheduleRequiresOpponentApproval?: boolean;
      readonly rescheduleRequiresOrganizerApproval?: boolean;
    };
  };
}): CompetitionDraft {
  const stage = stageRules({
    allowRescheduling: overrides?.allowRescheduling ?? true,
    maxReschedulesPerTeam:
      overrides?.maxReschedulesPerTeam === undefined ? 2 : overrides.maxReschedulesPerTeam,
  });
  return {
    competition: {
      id: competitionId,
      organizationId,
      name: "Liga Futrob",
      status: "published",
      modality: "fc-clubs",
      gameEdition: "FC 26",
      platform: "playstation",
      region: "south-america",
      timeZone: "America/Lima",
      format: overrides?.mixed ? "groups-knockout" : "league",
      teams: { min: 2, max: null },
      schedule: { startsOn: null, endsOn: null },
      cover: { kind: "preset", preset: "cup" },
      createdByActorId: asActorId("organizer-1"),
      createdAt: new Date("2026-07-31T12:00:00.000Z"),
      updatedAt: new Date("2026-07-31T12:00:00.000Z"),
    },
    rules: {
      competitionId,
      version: 1,
      regularStage: overrides?.knockoutOnly
        ? null
        : overrides?.mixed
          ? stageRules(overrides.mixed.regular)
          : stage,
      knockoutStage: overrides?.knockoutOnly
        ? stage
        : overrides?.mixed
          ? stageRules(overrides.mixed.knockout)
          : null,
      awayGoalsEnabled: false,
      maxRosterSize: null,
      createdAt: new Date("2026-07-31T12:00:00.000Z"),
    },
  };
}

function mixedFixturePlan(): FixturePlan {
  return {
    id: "plan-1",
    revision: 1,
    status: "active",
    generationKey: "key",
    generationFingerprint: "fp",
    organizationId,
    competitionId,
    rulesVersion: 1,
    generationVersion: 1,
    format: "groups-knockout",
    timeZone: "America/Lima",
    homeAndAway: false,
    seed: [teamId],
    stages: [
      { id: regularStageId, kind: "groups", order: 1, rounds: [] },
      { id: knockoutStageId, kind: "knockout", order: 2, rounds: [] },
    ],
  };
}

async function adapterWith(input?: {
  readonly draft?: CompetitionDraft;
  readonly plan?: FixturePlan;
}) {
  const competitions = new InMemoryCompetitionRepository();
  if (input?.draft) await competitions.saveDraft(input.draft);
  const fixtures = new InMemoryFixturePlanRepository();
  if (input?.plan) await fixtures.save(input.plan);
  return new CompetitionRescheduleRulesAdapter({
    competitions,
    fixtures,
    requests: new InMemoryScheduleChangeRequestRepository(),
  });
}

const closedRules = {
  allowRescheduling: false,
  maxReschedulesPerTeam: 0,
  minimumNoticeHours: 0,
  requiresOpponentApproval: true,
  requiresOrganizerApproval: true,
};

describe("CompetitionRescheduleRulesAdapter", () => {
  it("reads allowRescheduling and maxReschedulesPerTeam from the competition stage", async () => {
    const adapter = await adapterWith({
      draft: draft({ allowRescheduling: true, maxReschedulesPerTeam: 3 }),
    });

    await expect(
      adapter.getRules({ organizationId, competitionId, stageId: regularStageId }),
    ).resolves.toEqual({
      allowRescheduling: true,
      maxReschedulesPerTeam: 3,
      minimumNoticeHours: 12,
      requiresOpponentApproval: true,
      requiresOrganizerApproval: false,
    });
  });

  it("falls back to knockout rules and treats a null max as unlimited", async () => {
    const adapter = await adapterWith({
      draft: draft({ knockoutOnly: true, allowRescheduling: true, maxReschedulesPerTeam: null }),
    });

    await expect(
      adapter.getRules({ organizationId, competitionId, stageId: knockoutStageId }),
    ).resolves.toEqual({
      allowRescheduling: true,
      maxReschedulesPerTeam: Number.MAX_SAFE_INTEGER,
      minimumNoticeHours: 12,
      requiresOpponentApproval: true,
      requiresOrganizerApproval: false,
    });
  });

  it("uses the knockout stage rules, approvals included, for a knockout Encounter", async () => {
    const adapter = await adapterWith({
      draft: draft({
        mixed: {
          regular: { allowRescheduling: false, maxReschedulesPerTeam: 1 },
          knockout: {
            allowRescheduling: true,
            maxReschedulesPerTeam: 4,
            minimumRescheduleNoticeHours: 24,
            rescheduleRequiresOpponentApproval: false,
            rescheduleRequiresOrganizerApproval: true,
          },
        },
      }),
      plan: mixedFixturePlan(),
    });

    await expect(
      adapter.getRules({ organizationId, competitionId, stageId: knockoutStageId }),
    ).resolves.toEqual({
      allowRescheduling: true,
      maxReschedulesPerTeam: 4,
      minimumNoticeHours: 24,
      requiresOpponentApproval: false,
      requiresOrganizerApproval: true,
    });
    await expect(
      adapter.getRules({ organizationId, competitionId, stageId: regularStageId }),
    ).resolves.toEqual({
      allowRescheduling: false,
      maxReschedulesPerTeam: 1,
      minimumNoticeHours: 12,
      requiresOpponentApproval: true,
      requiresOrganizerApproval: false,
    });
  });

  it("fails closed when the competition is missing or has no stage rules", async () => {
    const adapter = await adapterWith();

    await expect(
      adapter.getRules({ organizationId, competitionId, stageId: regularStageId }),
    ).resolves.toEqual(closedRules);
    await expect(
      adapter.getRules({
        organizationId: asOrganizationId("org-other"),
        competitionId,
        stageId: regularStageId,
      }),
    ).resolves.toEqual(closedRules);
  });

  it("counts accepted requests only, never open or rejected attempts", async () => {
    const competitions = new InMemoryCompetitionRepository();
    await competitions.saveDraft(draft());
    const requests = new InMemoryScheduleChangeRequestRepository();
    const proposal = {
      id: "proposal-1",
      proposedStartAt: new Date("2026-09-21T21:30:00.000Z"),
      proposedByActorId: asActorId("captain-1"),
      proposedByTeamId: teamId,
      reason: "Travel",
      createdAt: new Date("2026-09-14T20:00:00.000Z"),
    };
    const base: ScheduleChangeRequest = {
      id: "req-open",
      organizationId,
      competitionId,
      encounterId,
      requestingTeamId: teamId,
      initiatedByActorId: asActorId("captain-1"),
      scope: { type: "entire_encounter" },
      status: "open",
      version: 1,
      decisions: [],
      proposals: [proposal],
      idempotencyKey: "idem-open",
      createdAt: proposal.createdAt,
      updatedAt: proposal.createdAt,
    };
    await requests.save(base);
    await requests.save({
      ...base,
      id: "req-accepted",
      status: "accepted",
      idempotencyKey: "idem-accepted",
    });
    await requests.save({
      ...base,
      id: "req-rejected",
      status: "rejected",
      idempotencyKey: "idem-rejected",
    });
    const adapter = new CompetitionRescheduleRulesAdapter({
      competitions,
      fixtures: new InMemoryFixturePlanRepository(),
      requests,
    });

    await expect(
      adapter.countAppliedReschedules({
        organizationId,
        competitionId,
        encounterId,
        teamId,
      }),
    ).resolves.toBe(1);
  });
});
