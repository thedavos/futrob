import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
  type AuthorizationDecision,
  type AuthorizationRequest,
  type EncounterId,
} from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import type { MatchDispute } from "../../domain/entities/match-dispute.ts";
import type { OfficialMatchSelection } from "../../domain/entities/official-match-selection.ts";
import {
  asEncounterStageId,
  type EncounterScheduleSnapshot,
} from "../../domain/ports/encounter-reader.port.ts";
import type { SelectionUnderDispute } from "../../domain/ports/selection-dispute-reader.port.ts";
import { RESULT_PERMISSION } from "../../domain/policies/result-permissions.ts";
import { ListCompetitionDisputesUseCase } from "./list-competition-disputes.use-case.ts";

const organizationId = asOrganizationId("org-1");
const competitionId = asCompetitionId("competition-1");
const actorId = asActorId("operator-1");
const home = asTeamId("team-home");
const away = asTeamId("team-away");

function encounter(id: string, overrides: Partial<EncounterScheduleSnapshot> = {}) {
  return {
    encounterId: asEncounterId(id),
    organizationId,
    competitionId,
    stageId: asEncounterStageId("plan-1:stage:1"),
    homeTeamId: home,
    awayTeamId: away,
    scheduledStartAt: new Date("2026-10-20T21:00:00.000Z"),
    officialMatchCount: 1 as const,
    homeExternalClubId: null,
    awayExternalClubId: null,
    providerKey: null,
    ...overrides,
  } satisfies EncounterScheduleSnapshot;
}

function selection(
  encounterId: EncounterId,
  status: OfficialMatchSelection["status"],
  updatedAt: string,
): OfficialMatchSelection {
  return {
    id: `selection-${encounterId}`,
    encounterId,
    organizationId,
    competitionId,
    status,
    version: 3,
    round: 1,
    currentProposalId: "proposal-1",
    createdAt: new Date("2026-10-20T22:00:00.000Z"),
    updatedAt: new Date(updatedAt),
  };
}

function dispute(selected: OfficialMatchSelection): MatchDispute {
  return {
    id: `dispute-${selected.encounterId}`,
    selectionId: selected.id,
    organizationId,
    competitionId,
    encounterId: selected.encounterId,
    status: "open",
    openedByActorId: asActorId("captain-away"),
    openedByTeamId: away,
    openedReason: "Wrong match selected",
    openedAt: new Date("2026-10-21T10:00:00.000Z"),
    reviewStartedByActorId: null,
    reviewStartedAt: null,
    resolvedByActorId: null,
    resolvedAt: null,
    resolution: null,
    resolutionProposalId: null,
    resolutionReason: null,
  };
}

function setup(input: {
  readonly cases: readonly SelectionUnderDispute[];
  readonly encounters: readonly EncounterScheduleSnapshot[];
  readonly allow: (request: AuthorizationRequest) => boolean;
}) {
  const requests: AuthorizationRequest[] = [];
  const decide = (request: AuthorizationRequest): AuthorizationDecision => {
    requests.push(request);
    const allowed = input.allow(request);
    return {
      allowed,
      permission: request.permission,
      scope: request.scope,
      reason: allowed ? "allowed" : "denied",
    };
  };
  const useCase = new ListCompetitionDisputesUseCase({
    disputes: { listUnderDispute: async () => input.cases },
    encounterReader: {
      getById: async (id) => input.encounters.find((row) => row.encounterId === id) ?? null,
    },
    authorization: {
      decide: async (request) => decide(request),
      decideEach: async ({ actorId: actor, permission, scopes }) =>
        scopes.map((scope) => decide({ actorId: actor, permission, scope })),
    },
  });
  return { useCase, requests };
}

describe("ListCompetitionDisputesUseCase", () => {
  it("lists disputed and organizer-review cases with their Encounter and dispute summary", async () => {
    const disputed = selection(asEncounterId("e-disputed"), "disputed", "2026-10-21T10:00:00Z");
    const review = selection(asEncounterId("e-review"), "organizer_review", "2026-10-22T09:00:00Z");
    const { useCase, requests } = setup({
      cases: [
        { selection: disputed, activeDispute: dispute(disputed) },
        { selection: review, activeDispute: null },
      ],
      encounters: [encounter("e-disputed"), encounter("e-review")],
      allow: () => true,
    });

    const result = await useCase.execute({ actorId, organizationId, competitionId });

    expect(result.isOk() && result.value).toEqual([
      {
        encounterId: "e-disputed",
        status: "disputed",
        homeTeamId: home,
        awayTeamId: away,
        scheduledStartAt: new Date("2026-10-20T21:00:00.000Z"),
        since: new Date("2026-10-21T10:00:00Z"),
        dispute: {
          id: "dispute-e-disputed",
          status: "open",
          openedByTeamId: away,
          openedAt: new Date("2026-10-21T10:00:00.000Z"),
          reviewStartedAt: null,
        },
      },
      expect.objectContaining({
        encounterId: "e-review",
        status: "organizer_review",
        dispute: null,
      }),
    ]);
    expect(requests).toEqual([
      expect.objectContaining({
        permission: RESULT_PERMISSION.resultApprove,
        scope: { organizationId, competitionId, encounterId: "e-disputed" },
      }),
      expect.objectContaining({
        scope: { organizationId, competitionId, encounterId: "e-review" },
      }),
    ]);
  });

  it("never exposes the dispute reason in the queue", async () => {
    const disputed = selection(asEncounterId("e-1"), "disputed", "2026-10-21T10:00:00Z");
    const { useCase } = setup({
      cases: [{ selection: disputed, activeDispute: dispute(disputed) }],
      encounters: [encounter("e-1")],
      allow: () => true,
    });

    const result = await useCase.execute({ actorId, organizationId, competitionId });

    expect(JSON.stringify(result.isOk() && result.value)).not.toContain("Wrong match selected");
  });

  it("hides an Encounter the operator is specifically denied", async () => {
    const visible = selection(asEncounterId("e-visible"), "disputed", "2026-10-21T10:00:00Z");
    const hidden = selection(asEncounterId("e-hidden"), "disputed", "2026-10-21T11:00:00Z");
    const { useCase } = setup({
      cases: [
        { selection: visible, activeDispute: null },
        { selection: hidden, activeDispute: null },
      ],
      encounters: [encounter("e-visible"), encounter("e-hidden")],
      allow: (request) => request.scope.encounterId !== "e-hidden",
    });

    const result = await useCase.execute({ actorId, organizationId, competitionId });

    expect(result.isOk() && result.value.map((row) => row.encounterId)).toEqual(["e-visible"]);
  });

  it("drops cases whose Encounter is missing or belongs to another tenant", async () => {
    const moved = selection(asEncounterId("e-moved"), "disputed", "2026-10-21T10:00:00Z");
    const missing = selection(asEncounterId("e-missing"), "disputed", "2026-10-21T10:00:00Z");
    const { useCase } = setup({
      cases: [
        { selection: moved, activeDispute: null },
        { selection: missing, activeDispute: null },
      ],
      encounters: [encounter("e-moved", { organizationId: asOrganizationId("org-2") })],
      allow: () => true,
    });

    const result = await useCase.execute({ actorId, organizationId, competitionId });

    expect(result.isOk() && result.value).toEqual([]);
  });

  it("returns an empty queue to an operator of a competition without disputes", async () => {
    const { useCase, requests } = setup({ cases: [], encounters: [], allow: () => true });

    const result = await useCase.execute({ actorId, organizationId, competitionId });

    expect(result.isOk() && result.value).toEqual([]);
    expect(requests).toEqual([
      expect.objectContaining({
        permission: RESULT_PERMISSION.resultApprove,
        scope: { organizationId, competitionId },
      }),
    ]);
  });

  it("refuses an actor without results.approve in the competition", async () => {
    const disputed = selection(asEncounterId("e-1"), "disputed", "2026-10-21T10:00:00Z");
    const { useCase } = setup({
      cases: [{ selection: disputed, activeDispute: null }],
      encounters: [encounter("e-1")],
      allow: () => false,
    });

    const result = await useCase.execute({ actorId, organizationId, competitionId });

    expect(result.isErr() && result.error.code).toBe("results.official_selection_forbidden");
  });
});
