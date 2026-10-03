import { FakeCompetitionRepository } from "../fake-competition-repository.test-helper.ts";
import { describe, expect, it } from "vite-plus/test";
import { unwrapErr } from "@futrob/test-support";
import { asActorId, asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import type { CompetitionEntry } from "../../domain/entities/competition-entry.ts";
import { EntryAlreadyDecided } from "../../domain/errors/competition.errors.ts";
import type { CompetitionEntryRepository } from "../../domain/ports/competition-entry.repository.ts";

import { CreateCompetitionDraftUseCase } from "../create-competition-draft/create-competition-draft.use-case.ts";
import { ApproveCompetitionEntryUseCase } from "./approve-competition-entry.use-case.ts";
import { allowAllAuthorization } from "../allow-all-authorization.test-helper.ts";

class FakeEntryRepository implements CompetitionEntryRepository {
  rows: CompetitionEntry[] = [];
  async countApprovedByCompetition(
    organizationId: ReturnType<typeof asOrganizationId>,
    competitionId: ReturnType<typeof asCompetitionId>,
  ) {
    return this.rows.filter(
      (entry) =>
        entry.organizationId === organizationId &&
        entry.competitionId === competitionId &&
        entry.status === "approved",
    ).length;
  }

  async findById(organizationId: ReturnType<typeof asOrganizationId>, entryId: string) {
    return (
      this.rows.find((row) => row.id === entryId && row.organizationId === organizationId) ?? null
    );
  }
  async findByCompetitionAndTeam(
    organizationId: ReturnType<typeof asOrganizationId>,
    competitionId: ReturnType<typeof asCompetitionId>,
    teamId: ReturnType<typeof asTeamId>,
  ) {
    return (
      this.rows.find(
        (row) =>
          row.organizationId === organizationId &&
          row.competitionId === competitionId &&
          row.teamId === teamId,
      ) ?? null
    );
  }
  async findByCreationKey(creationKey: string) {
    return this.rows.find((row) => row.creationKey === creationKey) ?? null;
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

function createHarness() {
  const competitions = new FakeCompetitionRepository();
  const entries = new FakeEntryRepository();
  let nextId = 0;
  const shared = {
    clock: { now: () => new Date("2026-08-01T12:00:00.000Z") },
    ids: { generate: () => `id-${++nextId}` },
  };
  return {
    competitions,
    entries,
    shared,
    approve: new ApproveCompetitionEntryUseCase({
      entries,
      competitions,
      authorization: {
        decide: async (request) => ({ ...request, allowed: true, reason: "allowed" as const }),
        getEffectiveAccess: async (input) => ({ ...input, roles: [], permissions: [] }),
      },
    }),
    seedEntry: async () => {
      const draft = await new CreateCompetitionDraftUseCase({
        competitions,
        authorization: allowAllAuthorization,
        ...shared,
      }).execute({
        organizationId: asOrganizationId("org-1"),
        actorId: asActorId("actor-1"),
        name: "Liga",
        gameEdition: "FC 26",
        platform: "pc",
        region: "south-america",
        timeZone: "America/Lima",
        format: "league",
      });
      expect(draft.isOk()).toBe(true);
      if (!draft.isOk()) throw new Error("draft failed");
      const entry: CompetitionEntry = {
        id: "entry-1",
        organizationId: asOrganizationId("org-1"),
        competitionId: draft.value.competition.id,
        teamId: asTeamId("team-1"),
        status: "pending",
        createdAt: shared.clock.now(),
        creationKey: null,
      };
      await entries.save(entry);
      return entry;
    },
  };
}

describe("ApproveCompetitionEntryUseCase", () => {
  it("approves a pending entry without consulting an external provider", async () => {
    const { approve, seedEntry } = createHarness();
    const entry = await seedEntry();
    const result = await approve.execute({
      actorId: asActorId("actor-1"),
      organizationId: asOrganizationId("org-1"),
      competitionId: entry.competitionId,
      entryId: entry.id,
    });
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    expect(result.value.status).toBe("approved");
  });

  it("rejects approval when entry is already decided", async () => {
    const { approve, entries, seedEntry } = createHarness();
    const entry = await seedEntry();
    await entries.save({ ...entry, status: "approved" });
    const result = await approve.execute({
      actorId: asActorId("actor-1"),
      organizationId: asOrganizationId("org-1"),
      competitionId: entry.competitionId,
      entryId: entry.id,
    });
    expect(result.isOk()).toBe(false);
    expect(!result.isOk() && EntryAlreadyDecided.is(result.error)).toBe(true);
  });

  it("does not approve an entry through a sibling competition id", async () => {
    const { approve, entries, seedEntry } = createHarness();
    const entry = await seedEntry();
    const result = await approve.execute({
      actorId: asActorId("actor-1"),
      organizationId: asOrganizationId("org-1"),
      competitionId: asCompetitionId("sibling-competition"),
      entryId: entry.id,
    });

    expect(unwrapErr(result).code).toBe("competitions.entry_not_found");
    expect((await entries.findById(entry.organizationId, entry.id))?.status).toBe("pending");
  });
});
