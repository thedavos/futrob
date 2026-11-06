import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
  type ActorId,
} from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import type { MatchDispute } from "../../domain/entities/match-dispute.ts";
import type { OfficialMatchSelection } from "../../domain/entities/official-match-selection.ts";
import type { SelectionStatus } from "../../domain/value-objects/selection-status.ts";
import { MemoryOfficialSelections } from "../selection-flow.test-support.ts";
import { CancelOpenSelectionUseCase } from "./cancel-open-selection.use-case.ts";

const organizationId = asOrganizationId("org-1");
const competitionId = asCompetitionId("competition-1");
const encounterId = asEncounterId("encounter-1");
const now = new Date("2026-11-01T12:00:00.000Z");

function create(status: SelectionStatus | null, systemActor: ActorId | null = null) {
  const selections = new MemoryOfficialSelections();
  if (status) {
    const selection: OfficialMatchSelection = {
      id: "selection-1",
      encounterId,
      organizationId,
      competitionId,
      status,
      version: 3,
      round: 1,
      currentProposalId: "proposal-1",
      createdAt: now,
      updatedAt: now,
    };
    selections.selections.set(encounterId, selection);
  }
  let ids = 0;
  const useCase = new CancelOpenSelectionUseCase({
    selections,
    ids: { generate: () => `id-${++ids}` },
    clock: { now: () => now },
    resolveSystemActor: async () => systemActor,
  });
  const input = { organizationId, competitionId, encounterId, reason: "  Team withdrew " };
  return { selections, useCase, input };
}

describe("CancelOpenSelectionUseCase", () => {
  it.each([
    "awaiting_provider_data",
    "candidates_available",
    "selection_in_progress",
    "awaiting_opponent_confirmation",
    "disputed",
    "organizer_review",
  ] as const)("voids a selection in %s and records who did it", async (status) => {
    const { selections, useCase, input } = create(status);

    const outcome = await useCase.execute({ ...input, actorId: asActorId("organizer") });

    expect(outcome.isOk() && outcome.value).toEqual({ status: "voided" });
    expect(selections.selections.get(encounterId)).toMatchObject({ status: "voided", version: 4 });
    expect(selections.actions).toMatchObject([
      {
        type: "voided",
        fromStatus: status,
        toStatus: "voided",
        actorId: "organizer",
        capacity: "operator",
        reason: "Team withdrew",
      },
    ]);
  });

  it.each(["approved", "voided"] as const)("leaves a %s selection alone", async (status) => {
    const { selections, useCase, input } = create(status);

    const outcome = await useCase.execute({ ...input, actorId: asActorId("organizer") });

    expect(outcome.isOk() && outcome.value).toEqual({ status: "nothing_open" });
    expect(selections.selections.get(encounterId)?.status).toBe(status);
    expect(selections.actions).toEqual([]);
  });

  it("needs no actor when nothing is open", async () => {
    const { useCase, input } = create(null);
    const outcome = await useCase.execute(input);
    expect(outcome.isOk() && outcome.value).toEqual({ status: "nothing_open" });
  });

  it("records the system actor when no organizer is behind the change", async () => {
    const { selections, useCase, input } = create("selection_in_progress", asActorId("system"));

    await useCase.execute(input);

    expect(selections.actions).toMatchObject([{ actorId: "system", capacity: "system" }]);
  });

  it("fails without writing when an open selection has no actor to record", async () => {
    const { selections, useCase, input } = create("selection_in_progress");

    const outcome = await useCase.execute(input);

    expect(outcome.isErr() && outcome.error.code).toBe(
      "results.selection_cancel_actor_unavailable",
    );
    expect(selections.selections.get(encounterId)?.status).toBe("selection_in_progress");
  });

  it("resolves an open dispute with the selection", async () => {
    const { selections, useCase, input } = create("disputed");
    const dispute: MatchDispute = {
      id: "dispute-1",
      selectionId: "selection-1",
      organizationId,
      competitionId,
      encounterId,
      status: "open",
      openedByActorId: asActorId("captain"),
      openedByTeamId: asTeamId("team"),
      openedReason: "Wrong match",
      openedAt: now,
      reviewStartedByActorId: null,
      reviewStartedAt: null,
      resolvedByActorId: null,
      resolvedAt: null,
      resolution: null,
      resolutionProposalId: null,
      resolutionReason: null,
    };
    selections.disputes.push(dispute);

    await useCase.execute({ ...input, actorId: asActorId("organizer") });

    expect(selections.disputes).toMatchObject([
      { id: "dispute-1", status: "resolved", resolvedByActorId: "organizer" },
    ]);
  });
});
