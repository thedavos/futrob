import { describe, expect, it } from "vite-plus/test";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  type DomainEvent,
} from "@futrob/shared-kernel";
import type { OfficialResult } from "../../domain/entities/official-result.ts";
import { allowAll } from "../encounter-candidates.test-support.ts";
import { MemoryOfficialResults, MemoryOfficialSelections } from "../selection-flow.test-support.ts";
import { VoidOfficialResultUseCase } from "./void-official-result.use-case.ts";

function create() {
  const results = new MemoryOfficialResults();
  const selections = new MemoryOfficialSelections();
  const events: DomainEvent[] = [];
  const permissions: string[] = [];
  let ids = 0;
  const useCase = new VoidOfficialResultUseCase({
    results,
    selections,
    authorization: {
      ...allowAll,
      async decide(request) {
        permissions.push(request.permission);
        return allowAll.decide(request);
      },
    },
    eventPublisher: {
      async publish(event) {
        events.push(event);
      },
      async publishMany(batch) {
        events.push(...batch);
      },
    },
    ids: { generate: () => `id-${++ids}` },
    clock: { now: () => new Date("2026-08-12T12:00:00.000Z") },
  });
  return { results, selections, events, permissions, useCase };
}

describe("VoidOfficialResultUseCase", () => {
  it("voids every approved revision for the encounter so older approvals cannot stay live", async () => {
    const { results, events, useCase } = create();
    const revisionOne = officialResult({ id: "result-1", revision: 1 });
    const revisionTwo = officialResult({ id: "result-2", revision: 2 });
    await results.append(revisionOne);
    await results.append(revisionTwo);

    const voided = await useCase.execute({
      actorId: asActorId("actor-2"),
      officialResultId: revisionTwo.id,
    });

    expect(voided.isOk() && voided.value).toMatchObject({
      id: "result-2",
      status: "voided",
      revision: 2,
    });
    expect(await results.findById(revisionOne.id)).toMatchObject({ status: "voided" });
    expect(await results.findById(revisionTwo.id)).toMatchObject({ status: "voided" });
    expect(await results.findApprovedByEncounter(revisionTwo.encounterId)).toBeNull();
    expect(events.map((event) => event.eventName)).toEqual(["results.official-result-voided"]);
  });

  it("voids once and converges when repeated", async () => {
    const { results, events, permissions, useCase } = create();
    const approved = officialResult();
    await results.append(approved);

    const first = await useCase.execute({
      actorId: asActorId("actor-2"),
      encounterId: approved.encounterId,
    });
    const second = await useCase.execute({
      actorId: asActorId("actor-2"),
      officialResultId: approved.id,
    });

    expect(first.isOk() && first.value.status).toBe("voided");
    expect(second.isOk() && second.value).toEqual(first.isOk() ? first.value : undefined);
    expect(permissions).toEqual(["encounters.results.approve", "encounters.results.approve"]);
    expect(events.map((event) => event.eventName)).toEqual(["results.official-result-voided"]);
  });

  it("keeps the slots and approval metadata of a voided revision", async () => {
    const { results, useCase } = create();
    const approved = officialResult();
    await results.append(approved);

    await useCase.execute({ actorId: asActorId("actor-2"), officialResultId: approved.id });

    expect(await results.findById(approved.id)).toEqual({ ...approved, status: "voided" });
  });
});

function officialResult(
  input: {
    readonly id?: string;
    readonly revision?: number;
  } = {},
): OfficialResult {
  return {
    id: input.id ?? "result-1",
    encounterId: asEncounterId("encounter-1"),
    organizationId: asOrganizationId("organization-1"),
    competitionId: asCompetitionId("competition-1"),
    revision: input.revision ?? 1,
    status: "approved",
    slots: [],
    approvedAt: new Date("2026-08-10T20:00:00.000Z"),
    approvedBy: asActorId("actor-1"),
  };
}
