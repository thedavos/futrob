import { describe, expect, it } from "vite-plus/test";
import { asActorId, asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import type { CompetitionEntry } from "../domain/entities/competition-entry.ts";
import type { CompetitionEntryRepository } from "../domain/ports/competition-entry.repository.ts";
import type {
  CompetitionDraft,
  CompetitionRepository,
} from "../domain/ports/competition.repository.ts";
import {
  CompetitionNotEditable,
  CompetitionPublishBlocked,
  InvalidCompetitionRules,
} from "../domain/errors/competition.errors.ts";
import { CreateCompetitionDraftUseCase } from "./create-competition-draft/create-competition-draft.use-case.ts";
import { PublishCompetitionUseCase } from "./publish-competition/publish-competition.use-case.ts";
import { RegisterTeamEntryUseCase } from "./register-team-entry/register-team-entry.use-case.ts";
import { UpdateCompetitionDraftUseCase } from "./update-competition-draft/update-competition-draft.use-case.ts";

class Competitions implements CompetitionRepository {
  draft: CompetitionDraft | null = null;
  async saveDraft(draft: CompetitionDraft) {
    this.draft = draft;
    return draft;
  }
  async publish(draft: CompetitionDraft) {
    this.draft = draft;
    return draft;
  }
  async findById(
    organizationId: ReturnType<typeof asOrganizationId>,
    competitionId: ReturnType<typeof asCompetitionId>,
  ) {
    return this.draft?.competition.organizationId === organizationId &&
      this.draft.competition.id === competitionId
      ? this.draft
      : null;
  }
  async findByCreationKey() {
    return null;
  }
  async findRulesByCompetitionId() {
    return this.draft?.rules ?? null;
  }
  async listByOrganization() {
    return this.draft ? [this.draft.competition] : [];
  }
}

class Entries implements CompetitionEntryRepository {
  rows: CompetitionEntry[] = [];
  async findById(organizationId: ReturnType<typeof asOrganizationId>, entryId: string) {
    return (
      this.rows.find((entry) => entry.organizationId === organizationId && entry.id === entryId) ??
      null
    );
  }
  async findByCompetitionAndTeam(
    competitionId: ReturnType<typeof asCompetitionId>,
    teamId: ReturnType<typeof asTeamId>,
  ) {
    return (
      this.rows.find((entry) => entry.competitionId === competitionId && entry.teamId === teamId) ??
      null
    );
  }
  async findByCreationKey(creationKey: string) {
    return this.rows.find((entry) => entry.creationKey === creationKey) ?? null;
  }
  async listByCompetition(
    organizationId: ReturnType<typeof asOrganizationId>,
    competitionId: ReturnType<typeof asCompetitionId>,
  ) {
    return this.rows.filter(
      (entry) => entry.organizationId === organizationId && entry.competitionId === competitionId,
    );
  }
  async save(entry: CompetitionEntry) {
    this.rows.push(entry);
    return entry;
  }
}

async function harness() {
  const competitions = new Competitions();
  const entries = new Entries();
  let id = 0;
  const clock = { now: () => new Date("2026-08-07T12:00:00.000Z") };
  const ids = { generate: () => `id-${++id}` };
  const created = await new CreateCompetitionDraftUseCase({ competitions, clock, ids }).execute({
    organizationId: asOrganizationId("org-1"),
    actorId: asActorId("actor-1"),
    name: "Liga",
    gameEdition: "FC 26",
    platform: "pc",
    region: "south-america",
    timeZone: "America/Lima",
    format: "league",
  });
  if (!created.isOk()) throw created.error;
  return { competitions, entries, clock, ids, draft: created.value };
}

describe("competition setup", () => {
  it("rejects incompatible stage and points rules", async () => {
    const { competitions, clock, draft } = await harness();
    const result = await new UpdateCompetitionDraftUseCase({ competitions, clock }).execute({
      organizationId: draft.competition.organizationId,
      competitionId: draft.competition.id,
      name: draft.competition.name,
      gameEdition: draft.competition.gameEdition,
      platform: draft.competition.platform,
      region: draft.competition.region,
      timeZone: draft.competition.timeZone,
      format: "league",
      rules: {
        regularStage: { ...draft.rules.regularStage!, winPoints: 1, drawPoints: 1 },
        knockoutStage: null,
        maxRosterSize: null,
      },
    });
    expect(!result.isOk() && InvalidCompetitionRules.is(result.error)).toBe(true);
  });

  it("requires two approved participants and locks structure after publishing", async () => {
    const { competitions, entries, clock, ids, draft } = await harness();
    const publish = new PublishCompetitionUseCase({ competitions, entries, clock });
    const blocked = await publish.execute({
      organizationId: draft.competition.organizationId,
      competitionId: draft.competition.id,
    });
    expect(!blocked.isOk() && CompetitionPublishBlocked.is(blocked.error)).toBe(true);
    const register = new RegisterTeamEntryUseCase({ competitions, entries, clock, ids });
    for (const teamId of ["team-1", "team-2"]) {
      const added = await register.execute({
        organizationId: draft.competition.organizationId,
        competitionId: draft.competition.id,
        teamId: asTeamId(teamId),
        approved: true,
      });
      expect(added.isOk() && added.value.status).toBe("approved");
    }
    const published = await publish.execute({
      organizationId: draft.competition.organizationId,
      competitionId: draft.competition.id,
    });
    expect(published.isOk() && published.value.competition.status).toBe("published");
    const lateParticipant = await register.execute({
      organizationId: draft.competition.organizationId,
      competitionId: draft.competition.id,
      teamId: asTeamId("team-3"),
      approved: true,
    });
    expect(!lateParticipant.isOk() && CompetitionNotEditable.is(lateParticipant.error)).toBe(true);
  });
});
