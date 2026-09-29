import { describe, expect, it } from "vite-plus/test";
import type { asCompetitionId } from "@futrob/shared-kernel";
import { asActorId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import type { CompetitionEntry } from "../domain/entities/competition-entry.ts";
import type { CompetitionEntryRepository } from "../domain/ports/competition-entry.repository.ts";
import type {
  CompetitionDraft,
  CompetitionRepository,
} from "../domain/ports/competition.repository.ts";
import {
  CompetitionNotEditable,
  CompetitionPublishBlocked,
  CompetitionRegistrationClosed,
  InvalidCompetitionRules,
} from "../domain/errors/competition.errors.ts";
import { CreateCompetitionDraftUseCase } from "./create-competition-draft/create-competition-draft.use-case.ts";
import { PublishCompetitionUseCase } from "./publish-competition/publish-competition.use-case.ts";
import { RegisterTeamEntryUseCase } from "./register-team-entry/register-team-entry.use-case.ts";
import { UpdateCompetitionDraftUseCase } from "./update-competition-draft/update-competition-draft.use-case.ts";
import { OpenCompetitionRegistrationUseCase } from "./open-competition-registration/open-competition-registration.use-case.ts";
import { UpdateCompetitionCoverUseCase } from "./update-competition-cover/update-competition-cover.use-case.ts";
import { ApproveCompetitionEntryUseCase } from "./approve-competition-entry/approve-competition-entry.use-case.ts";
import { ApplyToCompetitionUseCase } from "./apply-to-competition/apply-to-competition.use-case.ts";
import { CloseCompetitionRegistrationUseCase } from "./close-competition-registration/close-competition-registration.use-case.ts";
import { allowAllAuthorization } from "./allow-all-authorization.test-helper.ts";

class Competitions implements CompetitionRepository {
  draft: CompetitionDraft | null = null;
  async saveDraft(draft: CompetitionDraft) {
    this.draft = draft;
    return draft;
  }
  async saveCover(draft: CompetitionDraft) {
    if (!this.draft) throw new Error("Missing competition fixture");
    this.draft = {
      ...this.draft,
      competition: {
        ...this.draft.competition,
        cover: draft.competition.cover,
        updatedAt: draft.competition.updatedAt,
      },
    };
    return this.draft;
  }
  async changeStatus(draft: CompetitionDraft, expected: CompetitionDraft["competition"]["status"]) {
    if (this.draft?.competition.status !== expected) return null;
    this.draft = {
      ...this.draft,
      competition: {
        ...this.draft.competition,
        status: draft.competition.status,
        updatedAt: draft.competition.updatedAt,
      },
    };
    return this.draft;
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
      this.rows.find((entry) => entry.organizationId === organizationId && entry.id === entryId) ??
      null
    );
  }
  async findByCompetitionAndTeam(
    organizationId: ReturnType<typeof asOrganizationId>,
    competitionId: ReturnType<typeof asCompetitionId>,
    teamId: ReturnType<typeof asTeamId>,
  ) {
    return (
      this.rows.find(
        (entry) =>
          entry.organizationId === organizationId &&
          entry.competitionId === competitionId &&
          entry.teamId === teamId,
      ) ?? null
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
  const created = await new CreateCompetitionDraftUseCase({
    competitions,
    clock,
    ids,
    authorization: allowAllAuthorization,
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
  if (!created.isOk()) throw created.error;
  return { competitions, entries, clock, ids, draft: created.value };
}

describe("competition setup", () => {
  it("rejects incompatible stage and points rules", async () => {
    const { competitions, entries, clock, draft } = await harness();
    const result = await new UpdateCompetitionDraftUseCase({
      competitions,
      entries,
      clock,
      authorization: allowAllAuthorization,
    }).execute({
      actorId: asActorId("actor-1"),
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
    const publish = new PublishCompetitionUseCase({
      competitions,
      entries,
      clock,
      authorization: allowAllAuthorization,
    });
    const blocked = await publish.execute({
      actorId: asActorId("actor-1"),
      organizationId: draft.competition.organizationId,
      competitionId: draft.competition.id,
    });
    expect(!blocked.isOk() && CompetitionPublishBlocked.is(blocked.error)).toBe(true);
    const register = new RegisterTeamEntryUseCase({
      competitions,
      entries,
      clock,
      ids,
      authorization: allowAllAuthorization,
    });
    for (const teamId of ["team-1", "team-2"]) {
      const added = await register.execute({
        actorId: asActorId("actor-1"),
        organizationId: draft.competition.organizationId,
        competitionId: draft.competition.id,
        teamId: asTeamId(teamId),
        approved: true,
      });
      expect(added.isOk() && added.value.status).toBe("approved");
    }
    const published = await publish.execute({
      actorId: asActorId("actor-1"),
      organizationId: draft.competition.organizationId,
      competitionId: draft.competition.id,
    });
    expect(published.isOk() && published.value.competition.status).toBe("published");
    const lateParticipant = await register.execute({
      actorId: asActorId("actor-1"),
      organizationId: draft.competition.organizationId,
      competitionId: draft.competition.id,
      teamId: asTeamId("team-3"),
      approved: true,
    });
    expect(!lateParticipant.isOk() && CompetitionNotEditable.is(lateParticipant.error)).toBe(true);
  });

  it("opens registration, freezes structure, keeps participants editable and publishes", async () => {
    const { competitions, entries, clock, ids, draft } = await harness();
    const scope = {
      actorId: asActorId("actor-1"),
      organizationId: draft.competition.organizationId,
      competitionId: draft.competition.id,
    };
    const deps = { competitions, clock, authorization: allowAllAuthorization };
    const opened = await new OpenCompetitionRegistrationUseCase(deps).execute(scope);
    expect(opened.isOk() && opened.value.competition.status).toBe("registration");

    const edit = await new UpdateCompetitionDraftUseCase({ ...deps, entries }).execute({
      ...scope,
      name: "Liga renombrada",
      gameEdition: draft.competition.gameEdition,
      platform: draft.competition.platform,
      region: draft.competition.region,
      timeZone: draft.competition.timeZone,
      format: draft.competition.format,
      rules: {
        regularStage: draft.rules.regularStage,
        knockoutStage: draft.rules.knockoutStage,
        maxRosterSize: draft.rules.maxRosterSize,
      },
    });
    expect(!edit.isOk() && CompetitionNotEditable.is(edit.error)).toBe(true);

    const register = new RegisterTeamEntryUseCase({ ...deps, entries, ids });
    for (const teamId of ["team-1", "team-2"]) {
      const added = await register.execute({ ...scope, teamId: asTeamId(teamId), approved: true });
      expect(added.isOk() && added.value.status).toBe("approved");
    }
    const published = await new PublishCompetitionUseCase({ ...deps, entries }).execute(scope);
    expect(published.isOk() && published.value.competition.status).toBe("published");

    const reopen = await new OpenCompetitionRegistrationUseCase(deps).execute(scope);
    expect(!reopen.isOk() && CompetitionNotEditable.is(reopen.error)).toBe(true);
  });

  it("closes registration back to draft and is idempotent", async () => {
    const { competitions, clock, draft } = await harness();
    const scope = {
      actorId: asActorId("actor-1"),
      organizationId: draft.competition.organizationId,
      competitionId: draft.competition.id,
    };
    const deps = { competitions, clock, authorization: allowAllAuthorization };
    const close = new CloseCompetitionRegistrationUseCase(deps);
    const noop = await close.execute(scope);
    expect(noop.isOk() && noop.value.competition.status).toBe("draft");
    await new OpenCompetitionRegistrationUseCase(deps).execute(scope);
    const closed = await close.execute(scope);
    expect(closed.isOk() && closed.value.competition.status).toBe("draft");
  });

  it("accepts self-service applications only while registration is open", async () => {
    const { competitions, entries, clock, ids, draft } = await harness();
    const apply = new ApplyToCompetitionUseCase({ competitions, entries, clock, ids });
    const application = {
      organizationId: draft.competition.organizationId,
      competitionId: draft.competition.id,
      teamId: asTeamId("team-applicant"),
      creationKey: "apply-1:entry",
    };
    const early = await apply.execute(application);
    expect(!early.isOk() && CompetitionRegistrationClosed.is(early.error)).toBe(true);

    await new OpenCompetitionRegistrationUseCase({
      competitions,
      clock,
      authorization: allowAllAuthorization,
    }).execute({
      actorId: asActorId("actor-1"),
      organizationId: draft.competition.organizationId,
      competitionId: draft.competition.id,
    });
    const applied = await apply.execute(application);
    expect(applied.isOk() && applied.value.status).toBe("pending");
    const retried = await apply.execute(application);
    expect(retried.isOk() && applied.isOk() && retried.value.id === applied.value.id).toBe(true);
    expect(entries.rows).toHaveLength(1);
  });

  it("creates a draft with teams, schedule and cover, or with defaults when omitted", async () => {
    const competitions = new Competitions();
    const create = new CreateCompetitionDraftUseCase({
      competitions,
      clock: { now: () => new Date("2026-08-07T12:00:00.000Z") },
      ids: { generate: () => "comp-profile" },
      authorization: allowAllAuthorization,
    });
    const identity = {
      organizationId: asOrganizationId("org-1"),
      actorId: asActorId("actor-1"),
      name: "Liga",
      gameEdition: "FC 26",
      platform: "pc" as const,
      region: "south-america" as const,
      timeZone: "America/Lima",
      format: "league" as const,
    };

    const full = await create.execute({
      ...identity,
      teams: { min: 4, max: 8 },
      schedule: { startsOn: "2026-10-12", endsOn: "2026-12-20" },
      cover: { kind: "upload", key: "competition-covers/org-1/ck-1.png" },
    });
    expect(full.isOk() && full.value.competition).toMatchObject({
      teams: { min: 4, max: 8 },
      schedule: { startsOn: "2026-10-12", endsOn: "2026-12-20" },
      cover: { kind: "upload", key: "competition-covers/org-1/ck-1.png" },
    });

    const defaults = await create.execute(identity);
    expect(defaults.isOk() && defaults.value.competition).toMatchObject({
      teams: { min: 2, max: null },
      schedule: { startsOn: null, endsOn: null },
      cover: { kind: "preset", preset: "cup" },
    });
  });

  it("rejects impossible team ranges, dates and foreign covers", async () => {
    const { competitions, entries, clock, draft } = await harness();
    const update = new UpdateCompetitionDraftUseCase({
      competitions,
      entries,
      clock,
      authorization: allowAllAuthorization,
    });
    const base = updateInput(draft);
    const codes = await Promise.all(
      [
        { teams: { min: 5, max: 4 } },
        { teams: { min: 1, max: null } },
        { schedule: { startsOn: "2026-12-20", endsOn: "2026-10-12" } },
        { schedule: { startsOn: "2026-02-30", endsOn: null } },
        { cover: { kind: "upload" as const, key: "competition-covers/org-2/ck-1.png" } },
      ].map(async (patch) => {
        const result = await update.execute({ ...base, ...patch });
        return result.isOk() ? "ok" : result.error.code;
      }),
    );
    expect(codes).toEqual([
      "competitions.invalid_team_range",
      "competitions.invalid_team_range",
      "competitions.invalid_schedule",
      "competitions.invalid_schedule",
      "competitions.invalid_cover",
    ]);
  });

  it("publishes only once approved teams reach the competition minimum", async () => {
    const { competitions, entries, clock, ids, draft } = await harness();
    const scope = {
      actorId: asActorId("actor-1"),
      organizationId: draft.competition.organizationId,
      competitionId: draft.competition.id,
    };
    const deps = { competitions, entries, clock, ids, authorization: allowAllAuthorization };
    await new UpdateCompetitionDraftUseCase(deps).execute({
      ...updateInput(draft),
      teams: { min: 4, max: null },
    });
    const register = new RegisterTeamEntryUseCase(deps);
    const publish = new PublishCompetitionUseCase(deps);
    for (const teamId of ["team-1", "team-2", "team-3"]) {
      await register.execute({ ...scope, teamId: asTeamId(teamId), approved: true });
    }
    const blocked = await publish.execute(scope);
    expect(blocked.isOk() ? "published" : blocked.error.code).toBe("competitions.publish_blocked");
    await register.execute({ ...scope, teamId: asTeamId("team-4"), approved: true });
    const published = await publish.execute(scope);
    expect(published.isOk() && published.value.competition.status).toBe("published");

    const cover = await new UpdateCompetitionCoverUseCase(deps).execute({
      ...scope,
      cover: { kind: "preset", preset: "league" },
    });
    expect(cover.isOk() && cover.value.competition.cover).toEqual({
      kind: "preset",
      preset: "league",
    });
  });

  it("blocks approvals once the maximum is reached and keeps the range on partial edits", async () => {
    const { competitions, entries, clock, ids, draft } = await harness();
    const scope = {
      actorId: asActorId("actor-1"),
      organizationId: draft.competition.organizationId,
      competitionId: draft.competition.id,
    };
    const deps = { competitions, entries, clock, ids, authorization: allowAllAuthorization };
    const update = new UpdateCompetitionDraftUseCase(deps);
    await update.execute({ ...updateInput(draft), teams: { min: 2, max: 2 } });
    const kept = await update.execute(updateInput(draft));
    expect(kept.isOk() && kept.value.competition.teams).toEqual({ min: 2, max: 2 });

    const register = new RegisterTeamEntryUseCase(deps);
    for (const teamId of ["team-1", "team-2"]) {
      await register.execute({ ...scope, teamId: asTeamId(teamId), approved: true });
    }
    const third = await register.execute({ ...scope, teamId: asTeamId("team-3"), approved: true });
    expect(third.isOk() ? "ok" : third.error.code).toBe("competitions.capacity_reached");
    const again = await register.execute({ ...scope, teamId: asTeamId("team-1"), approved: true });
    expect(again.isOk() && again.value.status).toBe("approved");

    const pending = await register.execute({ ...scope, teamId: asTeamId("team-4") });
    if (!pending.isOk()) throw pending.error;
    const approve = await new ApproveCompetitionEntryUseCase(deps).execute({
      ...scope,
      entryId: pending.value.id,
    });
    expect(approve.isOk() ? "ok" : approve.error.code).toBe("competitions.capacity_reached");
  });
});

function updateInput(draft: CompetitionDraft) {
  return {
    actorId: asActorId("actor-1"),
    organizationId: draft.competition.organizationId,
    competitionId: draft.competition.id,
    name: draft.competition.name,
    gameEdition: draft.competition.gameEdition,
    platform: draft.competition.platform,
    region: draft.competition.region,
    timeZone: draft.competition.timeZone,
    format: draft.competition.format,
    rules: {
      regularStage: draft.rules.regularStage,
      knockoutStage: draft.rules.knockoutStage,
      maxRosterSize: draft.rules.maxRosterSize,
    },
  };
}
