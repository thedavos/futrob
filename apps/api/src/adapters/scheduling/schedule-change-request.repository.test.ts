import type { ScheduleChangeProposal, ScheduleChangeRequest } from "@futrob/scheduling";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
} from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { InMemoryScheduleChangeRequestRepository } from "./schedule-change-request.repository.ts";

const organizationId = asOrganizationId("org-a");
const otherOrganizationId = asOrganizationId("org-b");
const competitionId = asCompetitionId("competition-1");
const encounterId = asEncounterId("encounter-1");
const teamId = asTeamId("team-home");
const actorId = asActorId("captain-1");
const now = new Date("2026-09-14T20:00:00.000Z");

function proposal(
  overrides: Partial<ScheduleChangeProposal> & Pick<ScheduleChangeProposal, "id">,
): ScheduleChangeProposal {
  return {
    proposedStartAt: new Date("2026-09-21T21:30:00.000Z"),
    proposedByActorId: actorId,
    proposedByTeamId: teamId,
    reason: "Team travel conflict",
    createdAt: now,
    ...overrides,
  };
}

function request(
  overrides: Partial<ScheduleChangeRequest> & Pick<ScheduleChangeRequest, "id" | "idempotencyKey">,
): ScheduleChangeRequest {
  return {
    organizationId,
    competitionId,
    encounterId,
    requestingTeamId: teamId,
    initiatedByActorId: actorId,
    scope: { type: "entire_encounter" },
    status: "open",
    proposals: [proposal({ id: `${overrides.id}-proposal` })],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("InMemoryScheduleChangeRequestRepository", () => {
  it("isolates idempotency keys and active lists by organization", async () => {
    const repository = new InMemoryScheduleChangeRequestRepository();
    const home = request({ id: "req-a", idempotencyKey: "idem-shared" });
    const away = request({
      id: "req-b",
      idempotencyKey: "idem-shared",
      organizationId: otherOrganizationId,
      encounterId,
    });

    await repository.save(home);
    await repository.save(away);

    await expect(repository.findByIdempotencyKey(organizationId, "idem-shared")).resolves.toEqual(
      home,
    );
    await expect(
      repository.findByIdempotencyKey(otherOrganizationId, "idem-shared"),
    ).resolves.toEqual(away);
    await expect(repository.listActiveByEncounter(organizationId, encounterId)).resolves.toEqual([
      home,
    ]);
    await expect(
      repository.listActiveByEncounter(otherOrganizationId, encounterId),
    ).resolves.toEqual([away]);
  });

  it("refuses to overwrite another organization's request id", async () => {
    const repository = new InMemoryScheduleChangeRequestRepository();
    const original = request({ id: "req-shared", idempotencyKey: "idem-a" });
    await repository.save(original);

    await repository.save(
      request({
        id: "req-shared",
        idempotencyKey: "idem-b",
        organizationId: otherOrganizationId,
        requestingTeamId: asTeamId("team-other"),
      }),
    );

    await expect(repository.findByIdempotencyKey(organizationId, "idem-a")).resolves.toEqual(
      original,
    );
    await expect(
      repository.findByIdempotencyKey(otherOrganizationId, "idem-b"),
    ).resolves.toBeNull();
  });

  it("rejects a reused idempotency key for a different request in the same organization", async () => {
    const repository = new InMemoryScheduleChangeRequestRepository();
    await repository.save(request({ id: "req-1", idempotencyKey: "idem-1" }));

    await expect(
      repository.save(request({ id: "req-2", idempotencyKey: "idem-1" })),
    ).rejects.toThrow(/unique/);
    await expect(repository.findByIdempotencyKey(organizationId, "idem-1")).resolves.toMatchObject({
      id: "req-1",
    });
  });

  it("allows compatible OfficialMatch slots and rejects entire-Encounter overlap", async () => {
    const repository = new InMemoryScheduleChangeRequestRepository();
    const slotOne = request({
      id: "req-slot-1",
      idempotencyKey: "idem-slot-1",
      scope: { type: "official_match", officialSlot: 1 },
    });
    const slotTwo = request({
      id: "req-slot-2",
      idempotencyKey: "idem-slot-2",
      scope: { type: "official_match", officialSlot: 2 },
    });
    await repository.save(slotOne);
    await repository.save(slotTwo);

    await expect(repository.listActiveByEncounter(organizationId, encounterId)).resolves.toEqual([
      slotOne,
      slotTwo,
    ]);
    await expect(
      repository.save(
        request({
          id: "req-entire",
          idempotencyKey: "idem-entire",
          scope: { type: "entire_encounter" },
        }),
      ),
    ).rejects.toThrow(/unique/);
    await expect(
      repository.save(
        request({
          id: "req-slot-1-again",
          idempotencyKey: "idem-slot-1-again",
          scope: { type: "official_match", officialSlot: 1 },
        }),
      ),
    ).rejects.toThrow(/unique/);
  });

  it("releases the active mutex when the request is no longer open", async () => {
    const repository = new InMemoryScheduleChangeRequestRepository();
    const open = request({ id: "req-open", idempotencyKey: "idem-open" });
    await repository.save(open);
    await repository.save({ ...open, status: "rejected", updatedAt: new Date(now.getTime() + 1) });

    const next = request({ id: "req-next", idempotencyKey: "idem-next" });
    await expect(repository.save(next)).resolves.toEqual(next);
    await expect(repository.listActiveByEncounter(organizationId, encounterId)).resolves.toEqual([
      next,
    ]);
  });

  it("counts only accepted requests for the requesting Team on that Encounter", async () => {
    const repository = new InMemoryScheduleChangeRequestRepository();
    await repository.save(request({ id: "req-open", idempotencyKey: "idem-open" }));
    await repository.save(
      request({
        id: "req-accepted",
        idempotencyKey: "idem-accepted",
        status: "accepted",
        encounterId: asEncounterId("encounter-2"),
      }),
    );
    await repository.save(
      request({
        id: "req-accepted-here",
        idempotencyKey: "idem-accepted-here",
        status: "accepted",
      }),
    );
    await repository.save(
      request({
        id: "req-other-org",
        idempotencyKey: "idem-other-org",
        organizationId: otherOrganizationId,
        status: "accepted",
      }),
    );
    await repository.save(
      request({
        id: "req-rejected",
        idempotencyKey: "idem-rejected",
        status: "rejected",
      }),
    );

    await expect(
      repository.countAcceptedByTeam({
        organizationId,
        competitionId,
        encounterId,
        teamId,
      }),
    ).resolves.toBe(1);
  });

  it("round-trips proposal history in order", async () => {
    const repository = new InMemoryScheduleChangeRequestRepository();
    const first = proposal({ id: "proposal-1" });
    const second = proposal({
      id: "proposal-2",
      proposedStartAt: new Date("2026-09-22T21:30:00.000Z"),
      reason: "Counter with a later kickoff",
      createdAt: new Date("2026-09-14T21:00:00.000Z"),
    });
    const saved = await repository.save(
      request({
        id: "req-history",
        idempotencyKey: "idem-history",
        proposals: [first, second],
      }),
    );

    expect(saved.proposals).toEqual([first, second]);
    await expect(repository.findByIdempotencyKey(organizationId, "idem-history")).resolves.toEqual(
      saved,
    );
  });
});
