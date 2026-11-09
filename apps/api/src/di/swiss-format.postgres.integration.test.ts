import type { FixtureEncounter, FixturePlan } from "@futrob/scheduling";
import { asPublicCompetitionKey } from "@futrob/public-portal";
import { parseOrganizationSlug } from "@futrob/organizations";
import { asOrganizationId, asTeamId, type EncounterId, type TeamId } from "@futrob/shared-kernel";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vite-plus/test";
import { PostgresProviderMatchRepository } from "@/adapters/game-data/persistence/postgres.repository.ts";
import {
  createIsolatedSchema,
  migrateIsolatedSchema,
  type IsolatedSchema,
} from "@/testing/isolated-schema.ts";
import { seedActors } from "@/testing/seed-actors.ts";
import {
  AWAY,
  AWAY_CAPTAIN,
  COMPETITION,
  HOME,
  HOME_CAPTAIN,
  OPERATOR,
  ORG,
  providerMatch,
  seedComposition,
  slot,
} from "./official-selection.composition.fixture.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
const THIRD = asTeamId("team-third");
const FOURTH = asTeamId("team-fourth");
const CLUB_BY_TEAM = new Map<TeamId, string>([
  [HOME, "club-home"],
  [AWAY, "club-away"],
  [THIRD, "club-third"],
  [FOURTH, "club-fourth"],
]);
const CAPTAIN_BY_TEAM = new Map<TeamId, string>([
  [HOME, HOME_CAPTAIN],
  [AWAY, AWAY_CAPTAIN],
  [THIRD, "actor-third-captain"],
  [FOURTH, "actor-fourth-captain"],
]);

const stageRules = {
  officialMatchesPerEncounter: 1 as const,
  resolutionMode: "independent_matches" as const,
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  allowRescheduling: false,
  maxReschedulesPerTeam: 0,
  minimumRescheduleNoticeHours: 0,
  rescheduleProposalExpiryHours: 12,
  rescheduleRequiresOpponentApproval: false,
  rescheduleRequiresOrganizerApproval: false,
};

describe.skipIf(!databaseUrl)("Swiss format on Postgres", { timeout: 120_000 }, () => {
  let isolated: IsolatedSchema;

  beforeAll(async () => {
    isolated = await createIsolatedSchema(databaseUrl ?? "", "swiss_format");
    await migrateIsolatedSchema(isolated.pool);
  }, 180_000);

  afterAll(async () => {
    await isolated?.drop();
  }, 180_000);

  beforeEach(async () => {
    const schema = `"${isolated.schema}"`;
    await isolated.pool.query(
      `TRUNCATE ${schema}.organizations, ${schema}.actors, ${schema}.provider_matches RESTART IDENTITY CASCADE`,
    );
  });

  async function setup() {
    const matches = new PostgresProviderMatchRepository(isolated.pool);
    await seedActors(isolated.pool, "actor-third-captain", "actor-fourth-captain");
    const { modules } = await seedComposition({ pool: isolated.pool, matches });
    const draft = await modules.competitions.repository.findById(ORG, COMPETITION);
    if (!draft) throw new Error("competition draft missing");
    await modules.competitions.repository.saveDraft({
      competition: { ...draft.competition, format: "swiss" },
      rules: { ...draft.rules, regularStage: stageRules, knockoutStage: null },
    });
    await isolated.pool.query(`UPDATE competitions SET status = 'published' WHERE id = $1`, [
      COMPETITION,
    ]);
    for (const [teamId, actorId] of [
      [THIRD, "actor-third-captain"],
      [FOURTH, "actor-fourth-captain"],
    ] as const) {
      await modules.teams.repositories.teams.save({
        id: teamId,
        organizationId: ORG,
        name: teamId,
        createdAt: new Date("2026-09-14T00:00:00.000Z"),
        createdByActorId: OPERATOR,
        creationKey: null,
      });
      await modules.competitions.entryRepository.save({
        id: `entry-${teamId}`,
        organizationId: ORG,
        competitionId: COMPETITION,
        teamId,
        status: "approved",
        createdAt: new Date("2026-09-14T00:00:00.000Z"),
        creationKey: null,
      });
      await modules.teams.externalClubConnections.upsert({
        teamId,
        providerKey: "ea-clubs",
        externalClubId: CLUB_BY_TEAM.get(teamId) ?? "",
        externalClubName: teamId,
        gameEdition: "FC 26",
        platform: "common-gen5",
      });
      const profile = await modules.teams.repositories.profiles.saveIfAbsent({
        id: `profile-${actorId}`,
        actorId: actorId as never,
        createdAt: new Date("2026-09-14T00:00:00.000Z"),
      });
      await modules.teams.repositories.rosters.add({
        id: `roster-${actorId}`,
        organizationId: ORG,
        competitionId: COMPETITION,
        teamId,
        playerProfileId: profile.id,
        gameAccountId: null,
        role: "captain",
        createdAt: new Date("2026-09-14T00:00:00.000Z"),
      });
    }
    const generated = await modules.scheduling.generateFixture.execute({
      actorId: OPERATOR,
      organizationId: ORG,
      competitionId: COMPETITION,
      generationVersion: 1,
      startsAt: new Date("2031-01-05T20:00:00.000Z"),
      roundIntervalDays: 7,
      homeAndAway: false,
      seed: [HOME, AWAY, THIRD, FOURTH],
      swiss: { rounds: 2 },
    });
    if (generated.isErr()) throw generated.error;
    const planId = generated.value.id;

    const plan = async (): Promise<FixturePlan> => {
      const found = await modules.scheduling.fixturePlans.findById(ORG, COMPETITION, planId);
      if (!found) throw new Error("plan missing");
      return found;
    };
    const round = async (number: number): Promise<readonly FixtureEncounter[]> => {
      const current = await plan();
      return current.stages[0]!.rounds.find((item) => item.number === number)?.encounters ?? [];
    };

    let uniqueMatch = 0;
    const propose = async (encounter: FixtureEncounter) => {
      if (encounter.home.kind !== "team" || encounter.away.kind !== "team") {
        throw new Error("Only Team vs Team encounters are proposed");
      }
      const externalId = `match-${(uniqueMatch += 1)}`;
      const base = providerMatch(externalId);
      await matches.upsertMany([
        {
          ...base,
          occurredAt: new Date(encounter.scheduledStartAt.getTime() + 600_000),
          home: { ...base.home, externalClubId: CLUB_BY_TEAM.get(encounter.home.teamId) ?? "" },
          away: { ...base.away, externalClubId: CLUB_BY_TEAM.get(encounter.away.teamId) ?? "" },
        },
      ]);
      await modules.results.associateEncounterCandidates.execute({
        organizationId: ORG,
        encounterId: encounter.id,
      });
      const proposed = await modules.officialSelection.propose.execute({
        actorId: CAPTAIN_BY_TEAM.get(encounter.home.teamId) as never,
        organizationId: ORG,
        encounterId: encounter.id,
        actingTeamId: encounter.home.teamId,
        selections: slot(externalId),
        expectedVersion: 0,
        commandKey: `propose-${encounter.id}`,
      });
      if (!proposed.isOk()) throw new Error(`propose failed: ${proposed.error.code}`);
      return proposed.value;
    };
    const confirm = (
      encounter: FixtureEncounter,
      proposed: Awaited<ReturnType<typeof propose>>,
    ) => {
      if (encounter.away.kind !== "team") throw new Error("Team expected");
      return modules.officialSelection.confirm.execute({
        actorId: CAPTAIN_BY_TEAM.get(encounter.away.teamId) as never,
        organizationId: ORG,
        encounterId: encounter.id,
        actingTeamId: encounter.away.teamId,
        proposalId: proposed.proposal!.id,
        expectedVersion: proposed.selection.version,
        commandKey: `confirm-${encounter.id}`,
      });
    };
    const approve = async (encounter: FixtureEncounter) => {
      const confirmed = await confirm(encounter, await propose(encounter));
      if (!confirmed.isOk()) throw new Error(`confirm failed: ${confirmed.error.code}`);
    };
    const count = async (table: string, encounterId: EncounterId) => {
      const result = await isolated.pool.query(
        `SELECT count(*)::int AS count FROM ${table} WHERE encounter_id = $1`,
        [encounterId],
      );
      return result.rows[0].count as number;
    };
    return { approve, confirm, count, modules, plan, planId, propose, round };
  }

  it("plays four Teams to the final through the real approval composition", async () => {
    const { approve, modules, plan, round } = await setup();
    const first = await round(1);
    expect(first).toHaveLength(2);
    expect(await round(2)).toEqual([]);

    await approve(first[0]!);
    expect(await round(2)).toEqual([]);
    const midway = await modules.statistics.useCases.getCompetitionStandings.execute({
      actorId: OPERATOR,
      organizationId: ORG,
      competitionId: COMPETITION,
    });
    expect(midway?.rows).toHaveLength(4);
    expect(midway?.swiss).toMatchObject({ currentRound: 1, isFinal: false });

    await approve(first[1]!);
    const second = await round(2);
    expect(second).toHaveLength(2);
    expect(second[0]!.id).toMatch(/:stage:1:round:2:encounter:1:p\d+$/);

    await approve(second[0]!);
    await approve(second[1]!);

    const final = await modules.statistics.useCases.getCompetitionStandings.execute({
      actorId: OPERATOR,
      organizationId: ORG,
      competitionId: COMPETITION,
    });
    expect(final?.formulaVersion).toBe("swiss-points-buchholz-gd-gf-v1");
    expect(final?.swiss).toEqual({
      roundsTotal: 2,
      roundsCompleted: 2,
      currentRound: null,
      isFinal: true,
    });
    expect(final?.rows.map((row) => row.points)).toEqual([6, 3, 3, 0]);
    expect(final?.rows.every((row) => row.played === 2 && row.swiss?.byes === 0)).toBe(true);

    const pub = await modules.publicPortal.getStandings.execute({
      key: asPublicCompetitionKey(COMPETITION),
    });
    expect(pub.isOk() && pub.value.swiss?.isFinal).toBe(true);
    if (!pub.isOk()) throw new Error(pub.error.code);
    expect(pub.value.rows[0]).toMatchObject({ position: 1, points: 6, withdrawn: false, byes: 0 });
    expect(JSON.stringify(pub.value)).not.toContain(HOME);
    expect((await plan()).revision).toBeGreaterThan(1);
  });

  it("produces exactly one pairing from two concurrent approvals of the last encounters", async () => {
    const { confirm, modules, plan, propose, round } = await setup();
    const [one, two] = (await round(1)) as [FixtureEncounter, FixtureEncounter];
    const [proposedOne, proposedTwo] = [await propose(one), await propose(two)];
    const revision = (await plan()).revision;

    const outcomes = await Promise.all([confirm(one, proposedOne), confirm(two, proposedTwo)]);

    expect(outcomes.every((outcome) => outcome.isOk())).toBe(true);
    const second = await round(2);
    expect(second).toHaveLength(2);
    expect((await plan()).revision).toBe(revision + 1);
    const rows = await isolated.pool.query(
      `SELECT count(*)::int AS count FROM fixture_encounters WHERE round_id = $1`,
      [second[0]!.roundId],
    );
    expect(rows.rows[0].count).toBe(2);
    const standings = await modules.statistics.useCases.getCompetitionStandings.execute({
      actorId: OPERATOR,
      organizationId: ORG,
      competitionId: COMPETITION,
    });
    expect(standings?.swiss).toMatchObject({ roundsCompleted: 1, currentRound: 2 });
  });

  it("rolls the void back when a later encounter has a selection, and unpairs when not", async () => {
    const { approve, count, modules, propose, round } = await setup();
    const first = await round(1);
    await approve(first[0]!);
    await approve(first[1]!);
    const later = await round(2);
    await propose(later[0]!);
    const standing = () =>
      modules.statistics.useCases.getCompetitionStandings.execute({
        actorId: OPERATOR,
        organizationId: ORG,
        competitionId: COMPETITION,
      });
    const points = (await standing())?.rows.map((row) => row.points);

    const blocked = await modules.voidOfficialResultAndUnproject.execute({
      actorId: OPERATOR,
      encounterId: first[0]!.id,
      reason: "Wrong evidence",
    });

    expect(blocked.isErr() && blocked.error.code).toBe("scheduling.advancement_not_reversible");
    expect(await modules.results.results.findApprovedByEncounter(first[0]!.id)).not.toBeNull();
    expect((await round(2)).map(({ id }) => id)).toEqual(later.map(({ id }) => id));
    expect((await standing())?.rows.map((row) => row.points)).toEqual(points);

    const selection = await modules.results.selections.findLatestByEncounter(later[0]!.id);
    await modules.results.selections.commitTransition({
      expectedVersion: selection!.version,
      selection: { ...selection!, status: "voided", version: selection!.version + 1 },
      newProposals: [],
      actions: [],
      dispute: null,
      references: { acquire: [], release: "all" },
    });

    const voided = await modules.voidOfficialResultAndUnproject.execute({
      actorId: OPERATOR,
      encounterId: first[0]!.id,
      reason: "Wrong evidence",
    });

    expect(voided.isOk()).toBe(true);
    expect(await round(2)).toEqual([]);
    for (const { id } of later) {
      expect(await count("encounter_schedule_snapshots", id)).toBe(0);
      expect(await count("official_matches", id)).toBe(0);
    }

    const selectionAfter = await modules.results.selections.findLatestByEncounter(first[0]!.id);
    expect(selectionAfter?.status).toBe("voided");
  });

  it("withdraws with replay, voiding the open selection and keeping a trail", async () => {
    const { count, modules, planId, propose, round } = await setup();
    const [table] = (await round(1)) as [FixtureEncounter, FixtureEncounter];
    await propose(table);
    const teamId = (table.home as { teamId: TeamId }).teamId;
    const rival = (table.away as { teamId: TeamId }).teamId;
    const command = {
      actorId: OPERATOR,
      organizationId: ORG,
      competitionId: COMPETITION,
      fixturePlanId: planId,
      teamId,
      reason: "Dropped out",
      requestId: "withdraw-1",
    };

    const withdrawn = await modules.swissRoundCommands.withdraw.execute(command);

    if (withdrawn.isErr()) throw withdrawn.error;
    expect(withdrawn.value.withdrawnTeamIds).toEqual([teamId]);
    const [converted] = await round(1);
    expect(converted).toMatchObject({
      id: table.id,
      home: { kind: "team", teamId: rival },
      away: { kind: "bye" },
      series: null,
    });
    expect(await count("encounter_schedule_snapshots", table.id)).toBe(0);
    expect(await count("official_matches", table.id)).toBe(0);
    const selection = await modules.results.selections.findLatestByEncounter(table.id);
    expect(selection?.status).toBe("voided");
    const actions = await modules.results.selections.listActions(table.id);
    expect(actions.at(-1)).toMatchObject({ type: "voided", actorId: OPERATOR });

    const replay = await modules.swissRoundCommands.withdraw.execute(command);

    expect(replay.isOk() && replay.value.revision).toBe(withdrawn.value.revision);
    const trail = await isolated.pool.query(
      `SELECT kind, team_id, actor_id, reason FROM swiss_round_actions WHERE fixture_plan_id = $1`,
      [planId],
    );
    expect(trail.rows).toEqual([
      { kind: "withdraw", team_id: teamId, actor_id: OPERATOR, reason: "Dropped out" },
    ]);
  });

  it("closes the round with replay, leaves results alone and pairs the next", async () => {
    const { approve, count, modules, planId, propose, round } = await setup();
    const [played, unplayed] = (await round(1)) as [FixtureEncounter, FixtureEncounter];
    await approve(played);
    await propose(unplayed);
    const command = {
      actorId: OPERATOR,
      organizationId: ORG,
      competitionId: COMPETITION,
      fixturePlanId: planId,
      roundNumber: 1,
      reason: "Deadline passed",
      requestId: "close-1",
    };

    const closed = await modules.swissRoundCommands.closeRound.execute(command);

    if (closed.isErr()) throw closed.error;
    const [kept, marked] = await round(1);
    expect(kept!.closedWithoutResult).toBeUndefined();
    expect(kept!.series).not.toBeNull();
    expect(marked).toMatchObject({
      id: unplayed.id,
      series: null,
      closedWithoutResult: true,
      home: { kind: "team" },
      away: { kind: "team" },
    });
    expect(await modules.results.results.findApprovedByEncounter(played.id)).not.toBeNull();
    expect(await modules.results.results.findApprovedByEncounter(unplayed.id)).toBeNull();
    expect(await count("encounter_schedule_snapshots", unplayed.id)).toBe(0);
    expect((await modules.results.selections.findLatestByEncounter(unplayed.id))?.status).toBe(
      "voided",
    );
    const next = await round(2);
    expect(next.length).toBeGreaterThan(0);
    const met = (encounter: FixtureEncounter) =>
      [encounter.home, encounter.away]
        .map((slot) => (slot.kind === "team" ? slot.teamId : ""))
        .sort()
        .join("|");
    expect(next.map(met)).not.toContain(met(unplayed));
    expect(next.map(met)).not.toContain(met(played));

    const replay = await modules.swissRoundCommands.closeRound.execute(command);
    expect(replay.isOk() && replay.value.revision).toBe(closed.value.revision);
    const trail = await isolated.pool.query(
      `SELECT kind, round_number FROM swiss_round_actions WHERE fixture_plan_id = $1`,
      [planId],
    );
    expect(trail.rows).toEqual([{ kind: "close_round", round_number: 1 }]);
  });

  it("rolls the whole command back when the reconciliation fails after writing", async () => {
    const { modules, plan, planId, round } = await setup();
    const before = await plan();
    const failure = new Error("candidates are unavailable");
    const participants = modules.scheduling.reconcileSwissRounds as unknown as {
      deps: { participants: { participantsChanged: () => Promise<void> } };
    };
    const original = participants.deps.participants.participantsChanged;
    participants.deps.participants.participantsChanged = async () => {
      throw failure;
    };
    try {
      await expect(
        modules.swissRoundCommands.withdraw.execute({
          actorId: OPERATOR,
          organizationId: ORG,
          competitionId: COMPETITION,
          fixturePlanId: planId,
          teamId: (before.stages[0]!.rounds[0]!.encounters[0]!.home as { teamId: TeamId }).teamId,
          reason: "Dropped out",
          requestId: "withdraw-fails",
        }),
      ).rejects.toThrow("candidates are unavailable");
    } finally {
      participants.deps.participants.participantsChanged = original;
    }
    expect(await plan()).toEqual(before);
    expect((await round(1)).map(({ id }) => id)).toEqual(
      before.stages[0]!.rounds[0]!.encounters.map(({ id }) => id),
    );
    const trail = await isolated.pool.query(`SELECT 1 FROM swiss_round_actions`);
    expect(trail.rowCount).toBe(0);
  });

  it("refuses the format on the free plan and accepts it on Pro", async () => {
    const { modules } = await setup();
    const organizationId = asOrganizationId("org-plan");
    await modules.organizations.repositories.organizations.create({
      id: organizationId,
      name: "Plan Org",
      normalizedName: "plan org",
      slug: parseOrganizationSlug("plan-org")!,
      timeZone: "America/Lima",
      logo: { kind: "monogram" },
      createdAt: new Date("2026-09-14T00:00:00.000Z"),
      createdByActorId: OPERATOR,
    });
    const draft = {
      organizationId,
      actorId: OPERATOR,
      name: "Suizo",
      gameEdition: "fc26",
      platform: "playstation" as const,
      region: "south-america" as const,
      timeZone: "America/Lima",
      format: "swiss" as const,
    };

    const refused = await modules.competitions.createDraft.execute(draft);
    expect(refused.isErr() && refused.error.code).toBe("competitions.format_not_in_plan");

    const assigned = await modules.billing.useCases.assignOrganizationPlan.execute({
      actorId: OPERATOR,
      organizationId,
      planKey: "pro",
      state: { status: "active" },
      reason: "Swiss test",
    });
    expect(assigned.isOk()).toBe(true);

    const accepted = await modules.competitions.createDraft.execute(draft);
    if (accepted.isErr()) throw accepted.error;
    expect(accepted.value.competition.format).toBe("swiss");
    expect(accepted.value.rules.knockoutStage).toBeNull();
    expect(accepted.value.rules.regularStage).not.toBeNull();
  });
});
