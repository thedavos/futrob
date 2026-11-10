import {
  asActorId,
  asCompetitionId,
  asOrganizationId,
  asTeamId,
  type AuthorizationPort,
  type AuthorizationRequest,
  type TeamId,
} from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import type { CompetitionStatus } from "../../domain/entities/competition.ts";
import type { CompetitionEntry } from "../../domain/entities/competition-entry.ts";
import type { CompetitionEntryRepository } from "../../domain/ports/competition-entry.repository.ts";
import type { CompetitionDraft } from "../../domain/ports/competition.repository.ts";
import { COMPETITION_PERMISSION } from "../../domain/policies/competition-permissions.ts";
import { FakeCompetitionRepository } from "../fake-competition-repository.test-helper.ts";
import { FakeSanctionRepository } from "./fake-sanction-repository.test-helper.ts";
import { ImposeSanctionUseCase } from "./impose-sanction.use-case.ts";
import { ListCompetitionSanctionsUseCase, ListTeamSanctionsUseCase } from "./list-sanctions.use-cases.ts";
import { RevokeSanctionUseCase } from "./revoke-sanction.use-case.ts";

const organizationId = asOrganizationId("org-1");
const competitionId = asCompetitionId("cmp-1");
const organizer = asActorId("organizer");
const captain = asActorId("captain");
const tigres = asTeamId("team-tigres");
const leones = asTeamId("team-leones");
const pending = asTeamId("team-pending");
const imposedAt = new Date("2026-11-10T12:00:00.000Z");
const revokedAt = new Date("2026-11-11T09:30:00.000Z");
const TEAM_READ = "teams.read";

function draft(status: CompetitionStatus): CompetitionDraft {
  return {
    competition: {
      id: competitionId,
      organizationId,
      name: "Liga Interclubes",
      status,
      modality: "fc-clubs",
      gameEdition: "FC 26",
      platform: "playstation",
      region: "south-america",
      timeZone: "America/Lima",
      format: "league",
      teams: { min: 2, max: null },
      schedule: { startsOn: null, endsOn: null },
      cover: { kind: "preset", preset: "cup" },
      createdByActorId: organizer,
      createdAt: imposedAt,
      updatedAt: imposedAt,
    },
    rules: {
      competitionId,
      version: 1,
      regularStage: null,
      knockoutStage: null,
      awayGoalsEnabled: false,
      maxRosterSize: null,
      rankingEligibility: null,
      createdAt: imposedAt,
    },
  };
}

function entry(teamId: TeamId, status: CompetitionEntry["status"]): CompetitionEntry {
  return {
    id: `entry-${teamId}`,
    organizationId,
    competitionId,
    teamId,
    status,
    createdAt: imposedAt,
    creationKey: null,
  };
}

/** Allows exactly the listed (actor, permission) pairs and records every decision. */
function authorizationFor(grants: Record<string, readonly string[]>) {
  const requests: AuthorizationRequest[] = [];
  const port: AuthorizationPort = {
    decide: async (request) => {
      requests.push(request);
      const allowed = grants[request.actorId]?.includes(request.permission) ?? false;
      return { ...request, allowed, reason: allowed ? "allowed" : "denied" };
    },
    getEffectiveAccess: async (input) => ({ ...input, roles: [], permissions: [] }),
  };
  return { port, requests };
}

function harness(options: { status?: CompetitionStatus } = {}) {
  const competitions = new FakeCompetitionRepository([draft(options.status ?? "published")]);
  const entries: Pick<CompetitionEntryRepository, "findByCompetitionAndTeam"> = {
    findByCompetitionAndTeam: async (org, cmp, teamId) =>
      [entry(tigres, "approved"), entry(leones, "approved"), entry(pending, "pending")].find(
        (row) => row.organizationId === org && row.competitionId === cmp && row.teamId === teamId,
      ) ?? null,
  };
  const targets = {
    findPlayerTeam: async (_org: unknown, _cmp: unknown, profileId: string) =>
      profileId === "profile-tigres-9" ? tigres : null,
    isEncounterOfTeam: async (_org: unknown, _cmp: unknown, encounterId: string, teamId: TeamId) =>
      encounterId === "enc-1" && (teamId === tigres || teamId === leones),
  };
  const sanctions = new FakeSanctionRepository();
  const authorization = authorizationFor({
    [organizer]: [
      COMPETITION_PERMISSION.sanctionsManage,
      COMPETITION_PERMISSION.sanctionsRead,
      TEAM_READ,
    ],
    [captain]: [TEAM_READ],
  });
  let now = imposedAt;
  let nextId = 0;
  const deps = {
    authorization: authorization.port,
    competitions,
    entries,
    targets,
    sanctions,
    clock: { now: () => now },
    ids: { generate: () => `sanction-${++nextId}` },
  };
  return {
    sanctions,
    requests: authorization.requests,
    advanceTo: (date: Date) => {
      now = date;
    },
    impose: new ImposeSanctionUseCase(deps),
    revoke: new RevokeSanctionUseCase(deps),
    listCompetition: new ListCompetitionSanctionsUseCase(deps),
    listTeam: new ListTeamSanctionsUseCase({ ...deps, teamReadPermission: TEAM_READ }),
  };
}

const scope = { organizationId, competitionId };
const deduction = {
  ...scope,
  actorId: organizer,
  requestId: "req-impose",
  target: { type: "team", teamId: tigres },
  type: "points_deduction",
  reason: "Alineación indebida en la jornada 3",
  pointsDeducted: 3,
} as const;

describe("ImposeSanctionUseCase", () => {
  it("stores the sanction with its actor, reason, date and correlation", async () => {
    const { impose, sanctions } = harness();

    const result = await impose.execute(deduction);

    expect(result.isOk() && result.value).toEqual({
      id: "sanction-1",
      organizationId,
      competitionId,
      targetType: "team",
      teamId: tigres,
      playerProfileId: null,
      type: "points_deduction",
      pointsDeducted: 3,
      suspensionMatches: null,
      encounterId: null,
      reason: "Alineación indebida en la jornada 3",
      imposedByActorId: organizer,
      imposedAt,
      requestId: "req-impose",
      revocation: null,
    });
    expect(sanctions.rows).toHaveLength(1);
  });

  it("refuses an actor without the manage permission and stores nothing", async () => {
    const { impose, sanctions, requests } = harness();

    const result = await impose.execute({ ...deduction, actorId: captain });

    expect(result.isErr() && result.error.code).toBe("authorization.forbidden");
    expect(requests.at(-1)).toMatchObject({
      permission: "competitions.sanctions.manage",
      scope: { organizationId, competitionId },
    });
    expect(sanctions.rows).toEqual([]);
  });

  it("files a player's sanction under the Team whose roster they are on", async () => {
    const { impose } = harness();

    const result = await impose.execute({
      ...scope,
      actorId: organizer,
      requestId: "req-2",
      target: { type: "player", playerProfileId: "profile-tigres-9" },
      type: "match_suspension",
      reason: "Expulsión por conducta violenta",
      suspensionMatches: 2,
    });

    expect(result.isOk() && result.value).toMatchObject({
      targetType: "player",
      playerProfileId: "profile-tigres-9",
      teamId: tigres,
      suspensionMatches: 2,
    });
  });

  it.each([
    ["a Team without an approved entry", { type: "team", teamId: pending }, "team"],
    ["a player with no roster here", { type: "player", playerProfileId: "stranger" }, "player"],
  ] as const)("does not sanction %s", async (_label, target, expected) => {
    const { impose } = harness();

    const result = await impose.execute({ ...deduction, target, type: "warning", pointsDeducted: null });

    expect(result.isErr() && result.error).toMatchObject({
      code: "competitions.sanction_target_not_found",
      target: expected,
    });
  });

  it("only declares an administrative defeat in an encounter the Team plays", async () => {
    const { impose } = harness();
    const defeat = {
      ...scope,
      actorId: organizer,
      requestId: "req-3",
      target: { type: "team", teamId: tigres },
      type: "administrative_defeat",
      reason: "No se presentó al encuentro",
    } as const;

    expect((await impose.execute({ ...defeat, encounterId: "enc-1" })).isOk()).toBe(true);
    const foreign = await impose.execute({ ...defeat, encounterId: "enc-other" });
    expect(foreign.isErr() && foreign.error).toMatchObject({ target: "encounter" });
  });

  it.each(["draft", "archived"] as const)("is closed while the competition is %s", async (status) => {
    const { impose } = harness({ status });

    const result = await impose.execute(deduction);

    expect(result.isErr() && result.error.code).toBe("competitions.sanctions_closed");
  });

  it("rejects invalid terms before touching the store", async () => {
    const { impose, sanctions } = harness();

    const result = await impose.execute({ ...deduction, pointsDeducted: 0 });

    expect(result.isErr() && result.error).toMatchObject({ field: "pointsDeducted" });
    expect(sanctions.rows).toEqual([]);
  });
});

describe("RevokeSanctionUseCase", () => {
  async function imposed() {
    const h = harness();
    const created = await h.impose.execute(deduction);
    if (created.isErr()) throw created.error;
    h.advanceTo(revokedAt);
    return { ...h, sanctionId: created.value.id };
  }

  it("keeps the sanction and records who revoked it, why, when and in which request", async () => {
    const { revoke, sanctions, sanctionId } = await imposed();

    const result = await revoke.execute({
      ...scope,
      actorId: organizer,
      sanctionId,
      reason: " Se comprobó que la alineación era válida ",
      requestId: "req-revoke",
    });

    expect(result.isOk() && result.value.revocation).toEqual({
      actorId: organizer,
      at: revokedAt,
      reason: "Se comprobó que la alineación era válida",
      requestId: "req-revoke",
    });
    expect(sanctions.rows).toHaveLength(1);
    expect(sanctions.rows[0]).toMatchObject({ reason: deduction.reason, imposedAt });
  });

  it("revokes only once", async () => {
    const { revoke, sanctionId } = await imposed();
    const input = {
      ...scope,
      actorId: organizer,
      sanctionId,
      reason: "Error de registro",
      requestId: "req-revoke",
    };

    await revoke.execute(input);
    const again = await revoke.execute(input);

    expect(again.isErr() && again.error.code).toBe("competitions.sanction_already_revoked");
  });

  it("refuses an actor without the manage permission", async () => {
    const { revoke, sanctions, sanctionId } = await imposed();

    const result = await revoke.execute({
      ...scope,
      actorId: captain,
      sanctionId,
      reason: "Error de registro",
      requestId: "req-revoke",
    });

    expect(result.isErr() && result.error.code).toBe("authorization.forbidden");
    expect(sanctions.rows[0]?.revocation).toBeNull();
  });

  it("does not find a sanction of another competition", async () => {
    const { revoke, sanctionId } = await imposed();

    const result = await revoke.execute({
      organizationId,
      competitionId: asCompetitionId("cmp-other"),
      actorId: organizer,
      sanctionId,
      reason: "Error de registro",
      requestId: "req-revoke",
    });

    expect(result.isErr() && result.error.code).toBe("competitions.not_found");
  });
});

describe("listing sanctions", () => {
  it("lists the whole competition, newest first, for whoever may read sanctions", async () => {
    const { impose, listCompetition } = harness();
    await impose.execute(deduction);
    await impose.execute({ ...deduction, target: { type: "team", teamId: leones } });

    const result = await listCompetition.execute({ ...scope, actorId: organizer });

    expect(result.isOk() && result.value.map((sanction) => sanction.teamId)).toEqual([
      leones,
      tigres,
    ]);
    const denied = await listCompetition.execute({ ...scope, actorId: captain });
    expect(denied.isErr() && denied.error.code).toBe("authorization.forbidden");
  });

  it("shows a Team only its own sanctions, authorized on that Team's scope", async () => {
    const { impose, listTeam, requests } = harness();
    await impose.execute(deduction);
    await impose.execute({ ...deduction, target: { type: "team", teamId: leones } });

    const result = await listTeam.execute({ ...scope, actorId: captain, teamId: tigres });

    expect(result.isOk() && result.value.map((sanction) => sanction.teamId)).toEqual([tigres]);
    expect(requests.at(-1)).toMatchObject({
      actorId: captain,
      permission: TEAM_READ,
      scope: { organizationId, competitionId, teamId: tigres },
    });
  });

  it("refuses a Team view to an actor without access to that Team", async () => {
    const { listTeam } = harness();

    const result = await listTeam.execute({
      ...scope,
      actorId: asActorId("outsider"),
      teamId: tigres,
    });

    expect(result.isErr() && result.error.code).toBe("authorization.forbidden");
  });
});
