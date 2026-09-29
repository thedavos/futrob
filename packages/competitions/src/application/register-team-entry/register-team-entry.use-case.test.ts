import { FakeCompetitionRepository } from "../fake-competition-repository.test-helper.ts";
import { describe, expect, it } from "vite-plus/test";
import { asActorId, asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import type { CompetitionEntry } from "../../domain/entities/competition-entry.ts";
import { CompetitionNotFound } from "../../domain/errors/competition.errors.ts";
import type { CompetitionEntryRepository } from "../../domain/ports/competition-entry.repository.ts";

import { CreateCompetitionDraftUseCase } from "../create-competition-draft/create-competition-draft.use-case.ts";
import {
  RegisterTeamEntryUseCase,
  registerTeamEntryUnchecked,
} from "./register-team-entry.use-case.ts";
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
    this.rows.push(entry);
    return entry;
  }
}

describe("RegisterTeamEntryUseCase", () => {
  it("registers a team entry idempotently and does not invent a roster", async () => {
    const competitions = new FakeCompetitionRepository();
    const entries = new FakeEntryRepository();
    let nextId = 0;
    const shared = {
      clock: { now: () => new Date("2026-08-01T12:00:00.000Z") },
      ids: { generate: () => `id-${++nextId}` },
      authorization: allowAllAuthorization,
    };
    const draft = await new CreateCompetitionDraftUseCase({
      competitions,
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
    if (!draft.isOk()) return;

    const useCase = new RegisterTeamEntryUseCase({
      competitions,
      entries,
      ...shared,
    });
    const input = {
      actorId: asActorId("actor-1"),
      organizationId: asOrganizationId("org-1"),
      competitionId: draft.value.competition.id,
      teamId: asTeamId("team-1"),
      creationKey: "entry:org-1:team-1",
    };
    const first = await useCase.execute(input);
    const second = await useCase.execute(input);
    expect(first.isOk() && second.isOk()).toBe(true);
    if (!first.isOk() || !second.isOk()) return;
    expect(second.value.id).toBe(first.value.id);
    expect(entries.rows).toHaveLength(1);
    expect(first.value.status).toBe("pending");
  });

  it("rejects registration when the competition is missing", async () => {
    const result = await new RegisterTeamEntryUseCase({
      competitions: new FakeCompetitionRepository(),
      entries: new FakeEntryRepository(),
      clock: { now: () => new Date() },
      ids: { generate: () => "id-1" },
      authorization: allowAllAuthorization,
    }).execute({
      actorId: asActorId("actor-1"),
      organizationId: asOrganizationId("org-1"),
      competitionId: asCompetitionId("missing"),
      teamId: asTeamId("team-1"),
    });
    expect(result.isOk()).toBe(false);
    expect(!result.isOk() && CompetitionNotFound.is(result.error)).toBe(true);
  });
});

describe("entry creation key scope", () => {
  it.each(["competition", "team"])(
    "rejects a key reused for a different %s without approving the original entry",
    async (scope) => {
      const entries = new FakeEntryRepository();
      const existing: CompetitionEntry = {
        id: "entry-existing",
        organizationId: asOrganizationId("org-1"),
        competitionId: asCompetitionId("competition-1"),
        teamId: asTeamId("team-1"),
        status: "pending",
        createdAt: new Date("2026-09-28T00:00:00Z"),
        creationKey: "same-entry-key",
      };
      await entries.save(existing);
      const result = await registerTeamEntryUnchecked(
        {
          entries,
          clock: { now: () => existing.createdAt },
          ids: { generate: () => "unused" },
        },
        {
          organizationId: existing.organizationId,
          competitionId:
            scope === "competition" ? asCompetitionId("competition-2") : existing.competitionId,
          teamId: scope === "team" ? asTeamId("team-2") : existing.teamId,
          creationKey: existing.creationKey!,
          approved: true,
        },
      );
      expect(result.isOk()).toBe(false);
      if (!result.isOk())
        expect(result.error.code).toBe("competitions.entry_creation_key_conflict");
      expect(entries.rows).toEqual([existing]);
    },
  );
});
