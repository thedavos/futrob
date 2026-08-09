import { describe, expect, it } from "vite-plus/test";
import { asActorId, asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import type { CompetitionEntry } from "../../domain/entities/competition-entry.ts";
import { EntryAlreadyDecided } from "../../domain/errors/competition.errors.ts";
import type { CompetitionEntryRepository } from "../../domain/ports/competition-entry.repository.ts";
import { RejectCompetitionEntryUseCase } from "./reject-competition-entry.use-case.ts";

class FakeEntryRepository implements CompetitionEntryRepository {
  rows: CompetitionEntry[] = [];
  async findById(organizationId: ReturnType<typeof asOrganizationId>, entryId: string) {
    return (
      this.rows.find((row) => row.id === entryId && row.organizationId === organizationId) ?? null
    );
  }
  async findByCompetitionAndTeam() {
    return null;
  }
  async findByCreationKey() {
    return null;
  }
  async save(entry: CompetitionEntry) {
    const index = this.rows.findIndex((row) => row.id === entry.id);
    if (index >= 0) {
      this.rows[index] = entry;
    } else {
      this.rows.push(entry);
    }
    return entry;
  }
}

describe("RejectCompetitionEntryUseCase", () => {
  const authorization = {
    decide: async (
      request: Parameters<import("@futrob/shared-kernel").AuthorizationPort["decide"]>[0],
    ) => ({
      ...request,
      allowed: true,
      reason: "allowed" as const,
    }),
    getEffectiveAccess: async (
      input: Parameters<import("@futrob/shared-kernel").AuthorizationPort["getEffectiveAccess"]>[0],
    ) => ({ ...input, roles: [], permissions: [] }),
  };
  it("rejects a pending entry", async () => {
    const entries = new FakeEntryRepository();
    const entry: CompetitionEntry = {
      id: "entry-1",
      organizationId: asOrganizationId("org-1"),
      competitionId: asCompetitionId("comp-1"),
      teamId: asTeamId("team-1"),
      status: "pending",
      createdAt: new Date("2026-08-01T12:00:00.000Z"),
      creationKey: null,
    };
    await entries.save(entry);
    const result = await new RejectCompetitionEntryUseCase({ entries, authorization }).execute({
      actorId: asActorId("actor-1"),
      organizationId: asOrganizationId("org-1"),
      competitionId: entry.competitionId,
      entryId: entry.id,
    });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.status).toBe("rejected");
  });

  it("rejects when entry is already decided", async () => {
    const entries = new FakeEntryRepository();
    const entry: CompetitionEntry = {
      id: "entry-1",
      organizationId: asOrganizationId("org-1"),
      competitionId: asCompetitionId("comp-1"),
      teamId: asTeamId("team-1"),
      status: "rejected",
      createdAt: new Date("2026-08-01T12:00:00.000Z"),
      creationKey: null,
    };
    await entries.save(entry);
    const result = await new RejectCompetitionEntryUseCase({ entries, authorization }).execute({
      actorId: asActorId("actor-1"),
      organizationId: asOrganizationId("org-1"),
      competitionId: entry.competitionId,
      entryId: entry.id,
    });
    expect(result.isOk()).toBe(false);
    expect(!result.isOk() && EntryAlreadyDecided.is(result.error)).toBe(true);
  });
});
