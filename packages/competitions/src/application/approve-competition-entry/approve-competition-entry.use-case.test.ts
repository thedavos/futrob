import { describe, expect, it } from "vite-plus/test";
import { asActorId, asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import type { CompetitionEntry } from "../../domain/entities/competition-entry.ts";
import { EntryAlreadyDecided } from "../../domain/errors/competition.errors.ts";
import type { CompetitionEntryRepository } from "../../domain/ports/competition-entry.repository.ts";
import type {
  CompetitionDraft,
  CompetitionRepository,
} from "../../domain/ports/competition.repository.ts";
import { CreateCompetitionDraftUseCase } from "../create-competition-draft/create-competition-draft.use-case.ts";
import { ApproveCompetitionEntryUseCase } from "./approve-competition-entry.use-case.ts";

class FakeCompetitionRepository implements CompetitionRepository {
  readonly rows = new Map<string, CompetitionDraft>();
  async saveDraft(draft: CompetitionDraft) {
    this.rows.set(draft.competition.id, draft);
    return draft;
  }
  async findById(
    organizationId: ReturnType<typeof asOrganizationId>,
    competitionId: ReturnType<typeof asCompetitionId>,
  ) {
    const draft = this.rows.get(competitionId) ?? null;
    return draft?.competition.organizationId === organizationId ? draft : null;
  }
  async findByCreationKey(creationKey: string) {
    return (
      [...this.rows.values()].find((row) => row.competition.creationKey === creationKey) ?? null
    );
  }

  async findRulesByCompetitionId(competitionId: ReturnType<typeof asCompetitionId>) {
    return this.rows.get(competitionId)?.rules ?? null;
  }

  async listByOrganization(organizationId: ReturnType<typeof asOrganizationId>) {
    return [...this.rows.values()]
      .map((row) => row.competition)
      .filter((competition) => competition.organizationId === organizationId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
}

class FakeEntryRepository implements CompetitionEntryRepository {
  rows: CompetitionEntry[] = [];
  async findById(organizationId: ReturnType<typeof asOrganizationId>, entryId: string) {
    return (
      this.rows.find((row) => row.id === entryId && row.organizationId === organizationId) ?? null
    );
  }
  async findByCompetitionAndTeam(
    competitionId: ReturnType<typeof asCompetitionId>,
    teamId: ReturnType<typeof asTeamId>,
  ) {
    return (
      this.rows.find((row) => row.competitionId === competitionId && row.teamId === teamId) ?? null
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
    }),
    seedEntry: async () => {
      const draft = await new CreateCompetitionDraftUseCase({ competitions, ...shared }).execute({
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
      organizationId: asOrganizationId("org-1"),
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
      organizationId: asOrganizationId("org-1"),
      entryId: entry.id,
    });
    expect(result.isOk()).toBe(false);
    expect(!result.isOk() && EntryAlreadyDecided.is(result.error)).toBe(true);
  });
});
