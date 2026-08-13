import { describe, expect, it } from "vite-plus/test";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  type AuthorizationPort,
  type DomainEvent,
} from "@futrob/shared-kernel";
import type { OfficialResult } from "../../domain/entities/official-result.ts";
import type { OfficialResultRepository } from "../../domain/ports/official-result.repository.ts";
import { VoidOfficialResultUseCase } from "./void-official-result.use-case.ts";

class ResultRepository implements OfficialResultRepository {
  readonly rows = new Map<string, OfficialResult>();

  async save(result: OfficialResult): Promise<OfficialResult> {
    this.rows.set(result.id, result);
    return result;
  }

  async findApprovedByEncounter(
    encounterId: OfficialResult["encounterId"],
  ): Promise<OfficialResult | null> {
    return (
      [...this.rows.values()].find(
        (result) => result.encounterId === encounterId && result.status === "approved",
      ) ?? null
    );
  }

  async findLatestByEncounter(
    encounterId: OfficialResult["encounterId"],
  ): Promise<OfficialResult | null> {
    return (
      [...this.rows.values()]
        .filter((result) => result.encounterId === encounterId)
        .sort((left, right) => right.revision - left.revision)[0] ?? null
    );
  }

  async findById(officialResultId: string): Promise<OfficialResult | null> {
    return this.rows.get(officialResultId) ?? null;
  }

  async listByCompetition(
    competitionId: OfficialResult["competitionId"],
  ): Promise<OfficialResult[]> {
    return [...this.rows.values()].filter((result) => result.competitionId === competitionId);
  }

  async listByEncounter(encounterId: OfficialResult["encounterId"]): Promise<OfficialResult[]> {
    return [...this.rows.values()].filter((result) => result.encounterId === encounterId);
  }
}

describe("VoidOfficialResultUseCase", () => {
  function allowAll(): AuthorizationPort {
    return {
      async decide(request) {
        return {
          allowed: true,
          permission: request.permission,
          scope: request.scope,
          reason: "allowed",
        };
      },
      async getEffectiveAccess(input) {
        return { actorId: input.actorId, scope: input.scope, roles: [], permissions: [] };
      },
    };
  }

  it("voids every approved revision for the encounter so older approvals cannot stay live", async () => {
    const results = new ResultRepository();
    const revisionOne = officialResult({ id: "result-1", revision: 1 });
    const revisionTwo = officialResult({ id: "result-2", revision: 2 });
    await results.save(revisionOne);
    await results.save(revisionTwo);
    const events: DomainEvent[] = [];
    const useCase = new VoidOfficialResultUseCase({
      results,
      authorization: allowAll(),
      eventPublisher: {
        async publish(event) {
          events.push(event);
        },
        async publishMany(batch) {
          events.push(...batch);
        },
      },
      clock: { now: () => new Date("2026-08-12T12:00:00.000Z") },
    });

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
    const results = new ResultRepository();
    const approved = officialResult();
    await results.save(approved);
    const events: DomainEvent[] = [];
    const permissions: string[] = [];
    const authorization: AuthorizationPort = {
      async decide(request) {
        permissions.push(request.permission);
        return {
          allowed: true,
          permission: request.permission,
          scope: request.scope,
          reason: "allowed",
        };
      },
      async getEffectiveAccess(input) {
        return { actorId: input.actorId, scope: input.scope, roles: [], permissions: [] };
      },
    };
    const useCase = new VoidOfficialResultUseCase({
      results,
      authorization,
      eventPublisher: {
        async publish(event) {
          events.push(event);
        },
        async publishMany(batch) {
          events.push(...batch);
        },
      },
      clock: { now: () => new Date("2026-08-12T12:00:00.000Z") },
    });

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
