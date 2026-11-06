import {
  asActorId,
  asTeamId,
  type DomainEvent,
  type EncounterId,
  type TeamId,
} from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import type { FixturePlan, FixtureRound } from "../../domain/entities/fixture-plan.ts";
import type { OfficialEncounterScore } from "../../domain/ports/official-encounter-score-reader.port.ts";
import type { SwissRoundAction } from "../../domain/ports/swiss-round-action-log.port.ts";
import { swissRounds } from "../../domain/policies/swiss-standing-points.ts";
import { AdvanceFixtureFromOfficialResultUseCase } from "../advance-fixture-from-official-result/advance-fixture-from-official-result.use-case.ts";
import { EditFixtureEncounterUseCase } from "../edit-fixture-encounter.use-case.ts";
import {
  authorization,
  FixturePlans,
  input as generationInput,
  Matches,
  Snapshots,
  source,
  sourceSnapshot,
  useCase as generationUseCase,
} from "../generate-competition-fixture.test-harness.ts";
import { CloseSwissRoundUseCase } from "./close-swiss-round.use-case.ts";
import { ReconcileSwissRoundsUseCase } from "./reconcile-swiss-rounds.use-case.ts";
import { WithdrawSwissTeamUseCase } from "./withdraw-swiss-team.use-case.ts";

const teams = ["a", "b", "c", "d", "e"].map((id) => asTeamId(`team-${id}`));
const [teamA, teamB, teamC, teamD] = teams as [TeamId, TeamId, TeamId, TeamId, TeamId];
const { organizationId, competitionId } = sourceSnapshot;
const scope = { organizationId, competitionId };
const actorId = asActorId("organizer");

async function setup(
  options: {
    readonly seed?: readonly TeamId[];
    readonly rounds?: number;
    readonly allowed?: boolean;
  } = {},
) {
  const seed = options.seed ?? [teamA, teamB, teamC, teamD];
  const fixtures = new FixturePlans();
  const snapshots = new Snapshots();
  const matches = new Matches();
  const events: DomainEvent[] = [];
  const fixtureSource = source({
    format: "swiss",
    approvedParticipants: seed,
    officialMatchCounts: { regular: 1, knockout: 1 },
    resolutionModes: { regular: "independent_matches", knockout: "independent_matches" },
  });
  const generated = await generationUseCase({
    fixtures,
    snapshots,
    matches,
    source: fixtureSource,
  }).useCase.execute({ ...generationInput(), swiss: { rounds: options.rounds ?? 2 } });
  if (generated.isErr()) throw generated.error;
  const planId = generated.value.id;

  const scores = new Map<EncounterId, OfficialEncounterScore>();
  const selections = new Set<EncounterId>();
  const cancelled: { encounterId: EncounterId; actorId?: string; reason: string }[] = [];
  const participantChanges: EncounterId[] = [];
  const locked: EncounterId[] = [];
  const held = new Set<EncounterId>();
  const actions: SwissRoundAction[] = [];

  const deps = {
    clock: { now: () => new Date("2026-08-11T22:00:00.000Z") },
    editGuard: {
      canEdit: async ({ encounterId }: { readonly encounterId: EncounterId }) =>
        !scores.has(encounterId) && !selections.has(encounterId),
    },
    encounters: snapshots,
    eventPublisher: {
      publish: async (event: DomainEvent) => void events.push(event),
      publishMany: async (batch: readonly DomainEvent[]) => void events.push(...batch),
    },
    fixtures,
    matches,
    mutationLock: {
      runExclusive: async <T>(encounterId: EncounterId, operation: () => Promise<T>) => {
        if (held.has(encounterId)) throw new Error(`Lock taken twice: ${encounterId}`);
        held.add(encounterId);
        locked.push(encounterId);
        try {
          return await operation();
        } finally {
          held.delete(encounterId);
        }
      },
    },
    openSelections: {
      cancelOpen: async (input: {
        readonly encounterId: EncounterId;
        readonly actorId?: string;
        readonly reason: string;
      }) => {
        selections.delete(input.encounterId);
        cancelled.push({
          encounterId: input.encounterId,
          reason: input.reason,
          ...(input.actorId ? { actorId: input.actorId } : {}),
        });
      },
    },
    participants: {
      participantsChanged: async ({ encounterId }: { readonly encounterId: EncounterId }) => {
        participantChanges.push(encounterId);
      },
    },
    scores: { listApproved: async () => scores },
    source: fixtureSource,
  };
  const reconcile = new ReconcileSwissRoundsUseCase(deps);
  const actionLog = {
    findByRequestId: async (_org: string, _comp: string, requestId: string) =>
      actions.find((action) => action.requestId === requestId) ?? null,
    append: async (action: SwissRoundAction) => void actions.push(action),
  };
  const commandDeps = {
    actions: actionLog,
    authorization: authorization(options.allowed ?? true),
    clock: deps.clock,
    fixtures,
    reconcile,
  };
  const withdraw = new WithdrawSwissTeamUseCase(commandDeps);
  const close = new CloseSwissRoundUseCase({
    ...commandDeps,
    encounters: snapshots,
    openSelections: deps.openSelections,
    participants: deps.participants,
    scores: deps.scores,
  });
  const advance = new AdvanceFixtureFromOfficialResultUseCase({ ...deps, swissRounds: reconcile });

  const plan = (): FixturePlan => fixtures.rows.get(planId) as FixturePlan;
  const round = (number: number): FixtureRound =>
    swissRounds(plan()).find((candidate) => candidate.number === number) as FixtureRound;
  const approve = (encounterId: EncounterId, homeGoals = 1, awayGoals = 0) =>
    scores.set(encounterId, {
      officialResultId: `result-${encounterId}`,
      revision: 1,
      slots: [{ officialSlot: 1, homeGoals, awayGoals }],
    });
  const approveRound = (number: number) => {
    for (const encounter of round(number).encounters) {
      if (encounter.series) approve(encounter.id);
    }
  };
  const command = { ...scope, actorId, fixturePlanId: planId, reason: "No show", requestId: "r-1" };

  return {
    actions,
    advance,
    approve,
    approveRound,
    cancelled,
    close,
    command,
    events,
    fixtures,
    fixtureSource,
    locked,
    matches,
    participantChanges,
    plan,
    reconcile,
    round,
    scores,
    selections,
    snapshots,
    withdraw,
  };
}

describe("ReconcileSwissRoundsUseCase", () => {
  it("pairs, projects and announces the next round after the last approval", async () => {
    const fixture = await setup();
    const [first, second] = fixture.round(1).encounters;
    fixture.approve(first!.id);

    const waiting = await fixture.advance.execute({ ...scope, encounterId: first!.id });
    expect(waiting.isOk() && waiting.value.changedEncounterIds).toEqual([]);
    expect(fixture.round(2).encounters).toEqual([]);

    fixture.approve(second!.id);
    const paired = await fixture.advance.execute({ ...scope, encounterId: second!.id });

    const created = fixture.round(2).encounters;
    expect(paired.isOk() && paired.value.changedEncounterIds).toEqual(created.map(({ id }) => id));
    expect(created).toHaveLength(2);
    for (const encounter of created) {
      expect(fixture.snapshots.rows.has(encounter.id)).toBe(true);
      expect(fixture.participantChanges).toContain(encounter.id);
    }
    expect(
      fixture.events.filter((event) => event.eventName === "scheduling.encounter-created"),
    ).toHaveLength(2);
  });

  it("repeats as a no-op", async () => {
    const fixture = await setup();
    fixture.approveRound(1);
    await fixture.reconcile.execute(scope);
    const revision = fixture.plan().revision;
    const events = fixture.events.length;

    const repeated = await fixture.reconcile.execute(scope);

    expect(repeated.isOk() && repeated.value.changedEncounterIds).toEqual([]);
    expect(fixture.plan().revision).toBe(revision);
    expect(fixture.events).toHaveLength(events);
  });

  it("unpairs the later round after a void and pairs it again under new ids", async () => {
    const fixture = await setup();
    fixture.approveRound(1);
    await fixture.reconcile.execute(scope);
    const previous = fixture.round(2).encounters.map(({ id }) => id);
    const voided = fixture.round(1).encounters[0]!.id;
    fixture.scores.delete(voided);

    const outcome = await fixture.advance.execute({ ...scope, encounterId: voided });

    expect(outcome.isOk()).toBe(true);
    expect(fixture.round(2).encounters).toEqual([]);
    for (const id of previous) expect(fixture.snapshots.rows.has(id)).toBe(false);
    expect(fixture.locked).toEqual(expect.arrayContaining(previous));
    expect(fixture.locked).not.toContain(voided);

    fixture.approve(voided);
    await fixture.advance.execute({ ...scope, encounterId: voided });
    const again = fixture.round(2).encounters.map(({ id }) => id);
    expect(again).toHaveLength(2);
    expect(again.filter((id) => previous.includes(id))).toEqual([]);
  });

  it("blocks the void when a later encounter already has a selection", async () => {
    const fixture = await setup();
    fixture.approveRound(1);
    await fixture.reconcile.execute(scope);
    const later = fixture.round(2).encounters[0]!.id;
    fixture.selections.add(later);
    const voided = fixture.round(1).encounters[0]!.id;
    fixture.scores.delete(voided);

    const outcome = await fixture.advance.execute({ ...scope, encounterId: voided });

    expect(outcome.isErr() && outcome.error.code).toBe("scheduling.advancement_not_reversible");
    expect(fixture.round(2).encounters).toHaveLength(2);
    expect(fixture.snapshots.rows.has(later)).toBe(true);
  });

  it("gives the rival a bye when a void reopens an encounter of a withdrawn Team", async () => {
    const fixture = await setup();
    const reopened = fixture.round(1).encounters[0]!;
    fixture.approveRound(1);
    await fixture.reconcile.execute(scope);
    await fixture.withdraw.execute({ ...fixture.command, teamId: teamA });
    fixture.scores.delete(reopened.id);

    const outcome = await fixture.advance.execute({ ...scope, encounterId: reopened.id });

    expect(outcome.isOk()).toBe(true);
    expect(fixture.round(1).encounters[0]).toMatchObject({
      id: reopened.id,
      home: { kind: "team", teamId: teamC },
      away: { kind: "bye" },
      series: null,
    });
    expect(fixture.snapshots.rows.has(reopened.id)).toBe(false);
    // The void path has no organizer: the owner signs with a system actor.
    expect(fixture.cancelled.at(-1)).toEqual({
      encounterId: reopened.id,
      reason: expect.any(String),
    });
  });

  it("drops the empty rounds when the only Teams left have already met", async () => {
    const fixture = await setup();
    await fixture.withdraw.execute({ ...fixture.command, teamId: teamA });
    await fixture.withdraw.execute({ ...fixture.command, teamId: teamC, requestId: "r-2" });
    const remaining = fixture.round(1).encounters;
    expect(remaining).toMatchObject([{ home: { teamId: teamB }, away: { teamId: teamD } }]);

    fixture.approve(remaining[0]!.id);
    await fixture.reconcile.execute(scope);

    expect(fixture.plan().stages[0]!.rounds.map((round) => round.number)).toEqual([1]);
  });
});

describe("WithdrawSwissTeamUseCase", () => {
  it("converts the current encounter into a bye, cancels its selection and leaves a trail", async () => {
    const fixture = await setup();
    const { id } = fixture.round(1).encounters[0]!;
    fixture.selections.add(id);

    const outcome = await fixture.withdraw.execute({
      ...fixture.command,
      teamId: teamA,
      heldEncounterIds: [id],
    });

    expect(outcome.isOk() && outcome.value.withdrawnTeamIds).toEqual([teamA]);
    expect(fixture.round(1).encounters[0]).toMatchObject({
      home: { teamId: teamC },
      away: { kind: "bye" },
    });
    expect(fixture.cancelled).toEqual([{ encounterId: id, actorId, reason: "No show" }]);
    expect(fixture.snapshots.rows.has(id)).toBe(false);
    expect(fixture.locked).not.toContain(id);
    expect(fixture.actions).toMatchObject([
      { kind: "withdraw", teamId: teamA, actorId, reason: "No show", requestId: "r-1" },
    ]);
  });

  it("removes a withdrawn Team's bye and leaves approved results alone", async () => {
    const fixture = await setup({ seed: [teamA, teamB, teamC] });
    const bye = fixture.round(1).encounters.at(-1)!;
    expect(bye).toMatchObject({ home: { teamId: teamC }, away: { kind: "bye" } });

    await fixture.withdraw.execute({ ...fixture.command, teamId: teamC });

    expect(fixture.round(1).encounters.map(({ id }) => id)).not.toContain(bye.id);
    expect(fixture.cancelled).toEqual([]);
  });

  it("replays the same request without applying anything", async () => {
    const fixture = await setup();
    await fixture.withdraw.execute({ ...fixture.command, teamId: teamA });
    const revision = fixture.plan().revision;

    const replay = await fixture.withdraw.execute({ ...fixture.command, teamId: teamA });

    expect(replay.isOk()).toBe(true);
    expect(fixture.plan().revision).toBe(revision);
    expect(fixture.actions).toHaveLength(1);
  });

  it("rejects a request id already used for something else", async () => {
    const fixture = await setup();
    await fixture.withdraw.execute({ ...fixture.command, teamId: teamA });
    const outcome = await fixture.withdraw.execute({ ...fixture.command, teamId: teamB });
    expect(outcome.isErr() && outcome.error.code).toBe("scheduling.invalid_fixture_configuration");
  });

  it.each([
    ["a Team outside the seed", asTeamId("stranger"), "scheduling.swiss_team_not_participant"],
  ])("rejects %s", async (_label, teamId, code) => {
    const fixture = await setup();
    const outcome = await fixture.withdraw.execute({ ...fixture.command, teamId });
    expect(outcome.isErr() && outcome.error.code).toBe(code);
  });

  it("rejects a second withdrawal of the same Team", async () => {
    const fixture = await setup();
    await fixture.withdraw.execute({ ...fixture.command, teamId: teamA });
    const outcome = await fixture.withdraw.execute({
      ...fixture.command,
      teamId: teamA,
      requestId: "r-2",
    });
    expect(outcome.isErr() && outcome.error.code).toBe("scheduling.swiss_team_already_withdrawn");
  });

  it("requires a reason", async () => {
    const fixture = await setup();
    const outcome = await fixture.withdraw.execute({
      ...fixture.command,
      teamId: teamA,
      reason: "   ",
    });
    expect(outcome.isErr() && outcome.error.code).toBe("scheduling.invalid_fixture_configuration");
    expect(fixture.plan().withdrawnTeamIds).toBeUndefined();
  });

  it("denies an actor without schedule management", async () => {
    const fixture = await setup({ allowed: false });
    const outcome = await fixture.withdraw.execute({ ...fixture.command, teamId: teamA });
    expect(outcome.isErr() && outcome.error.code).toBe("authorization.forbidden");
    expect(fixture.plan().withdrawnTeamIds).toBeUndefined();
  });

  it("rejects a plan of another format", async () => {
    const fixture = await setup();
    fixture.fixtures.rows.set(fixture.plan().id, { ...fixture.plan(), format: "league" });
    const outcome = await fixture.withdraw.execute({ ...fixture.command, teamId: teamA });
    expect(outcome.isErr() && outcome.error.code).toBe("scheduling.not_swiss_fixture");
  });
});

describe("CloseSwissRoundUseCase", () => {
  it("closes what is unplayed, keeps the approved result and pairs the next round", async () => {
    const fixture = await setup();
    const [played, unplayed] = fixture.round(1).encounters;
    fixture.approve(played!.id);
    fixture.selections.add(unplayed!.id);

    const outcome = await fixture.close.execute({ ...fixture.command, roundNumber: 1 });

    expect(outcome.isOk()).toBe(true);
    const [kept, closed] = fixture.round(1).encounters;
    expect(kept!.series).not.toBeNull();
    expect(kept!.closedWithoutResult).toBeUndefined();
    expect(closed).toMatchObject({ id: unplayed!.id, series: null, closedWithoutResult: true });
    expect(fixture.snapshots.rows.has(unplayed!.id)).toBe(false);
    expect(fixture.scores.has(unplayed!.id)).toBe(false);
    expect(fixture.cancelled).toEqual([{ encounterId: unplayed!.id, actorId, reason: "No show" }]);
    expect(fixture.round(2).encounters.length).toBeGreaterThan(0);
    expect(fixture.actions).toMatchObject([{ kind: "close_round", roundNumber: 1 }]);
  });

  it("closes the only round of a two-Team plan", async () => {
    const fixture = await setup({ seed: [teamA, teamB], rounds: 1 });
    expect((await fixture.close.execute({ ...fixture.command, roundNumber: 1 })).isOk()).toBe(true);
    expect(fixture.round(1).encounters[0]).toMatchObject({ closedWithoutResult: true });
  });

  it("replays without closing again", async () => {
    const fixture = await setup();
    await fixture.close.execute({ ...fixture.command, roundNumber: 1 });
    const revision = fixture.plan().revision;

    const replay = await fixture.close.execute({ ...fixture.command, roundNumber: 1 });

    expect(replay.isOk()).toBe(true);
    expect(fixture.plan().revision).toBe(revision);
    expect(fixture.actions).toHaveLength(1);
  });

  it("rejects a round other than the one being played", async () => {
    const fixture = await setup();
    const outcome = await fixture.close.execute({ ...fixture.command, roundNumber: 2 });
    expect(outcome.isErr() && outcome.error.code).toBe("scheduling.swiss_round_not_current");
  });

  it("denies an actor without schedule management", async () => {
    const fixture = await setup({ allowed: false });
    const outcome = await fixture.close.execute({ ...fixture.command, roundNumber: 1 });
    expect(outcome.isErr() && outcome.error.code).toBe("authorization.forbidden");
    expect(fixture.round(1).encounters[0]!.closedWithoutResult).toBeUndefined();
  });
});

describe("EditFixtureEncounterUseCase on a Swiss plan", () => {
  async function editing() {
    const fixture = await setup({ seed: [teamA, teamB, teamC] });
    const edit = new EditFixtureEncounterUseCase({
      authorization: authorization(true),
      audit: { findByRequestId: async () => null, append: async () => undefined },
      clock: { now: () => new Date("2026-08-11T22:00:00.000Z") },
      editGuard: { canEdit: async () => true },
      encounters: fixture.snapshots,
      eventPublisher: { publish: async () => undefined, publishMany: async () => undefined },
      fixtures: fixture.fixtures,
      matches: fixture.matches,
      mutationLock: { runExclusive: async (_id, operation) => operation() },
      source: fixture.fixtureSource,
      transaction: { runInTransaction: async (operation) => operation() },
    });
    const base = {
      ...scope,
      actorId,
      fixturePlanId: fixture.plan().id,
      reason: "Move",
      requestId: "edit-1",
    };
    return { edit, fixture, base };
  }

  it("rejects changing the Teams", async () => {
    const { edit, fixture, base } = await editing();
    const outcome = await edit.execute({
      ...base,
      encounterId: fixture.round(1).encounters[0]!.id,
      homeTeamId: teamB,
      awayTeamId: teamC,
    });
    expect(outcome.isErr() && outcome.error.code).toBe("scheduling.invalid_fixture_configuration");
  });

  it("rejects editing a bye", async () => {
    const { edit, fixture, base } = await editing();
    const outcome = await edit.execute({
      ...base,
      encounterId: fixture.round(1).encounters.at(-1)!.id,
      scheduledStartAt: new Date("2026-12-01T00:00:00.000Z"),
    });
    expect(outcome.isErr() && outcome.error.code).toBe("scheduling.fixture_encounter_not_editable");
  });

  it("rejects editing a closed encounter", async () => {
    const { edit, fixture, base } = await editing();
    const { id } = fixture.round(1).encounters[0]!;
    await fixture.close.execute({ ...fixture.command, roundNumber: 1 });
    const outcome = await edit.execute({
      ...base,
      encounterId: id,
      scheduledStartAt: new Date("2026-12-01T00:00:00.000Z"),
    });
    expect(outcome.isErr() && outcome.error.code).toBe("scheduling.fixture_encounter_not_editable");
  });

  it("still moves a paired encounter", async () => {
    const { edit, fixture, base } = await editing();
    const scheduledStartAt = new Date("2026-12-01T00:00:00.000Z");
    const { id } = fixture.round(1).encounters[0]!;
    const outcome = await edit.execute({ ...base, encounterId: id, scheduledStartAt });
    expect(outcome.isOk()).toBe(true);
    expect(fixture.round(1).encounters[0]!.scheduledStartAt).toEqual(scheduledStartAt);
    expect(fixture.snapshots.rows.get(id)?.scheduledStartAt).toEqual(scheduledStartAt);
  });
});

describe("Swiss fixture generation", () => {
  const swissSource = (count: number) =>
    source({
      format: "swiss",
      approvedParticipants: Array.from({ length: count }, (_, index) => asTeamId(`t${index}`)),
    });

  it("creates every round, pairing only the first and projecting no byes", async () => {
    const { useCase, snapshots } = generationUseCase({ source: swissSource(5) });

    const outcome = await useCase.execute(generationInput());

    if (outcome.isErr()) throw outcome.error;
    const rounds = swissRounds(outcome.value);
    expect(outcome.value.stages[0]).toMatchObject({ kind: "swiss" });
    expect(outcome.value.stages[0]!.id).toMatch(/:stage:1$/);
    expect(rounds.map((round) => round.encounters.length)).toEqual([3, 0, 0]);
    expect(rounds[0]!.encounters[0]!.id).toBe(`${rounds[0]!.id}:encounter:1:p1`);
    expect(rounds[0]!.encounters.at(-1)).toMatchObject({ away: { kind: "bye" }, series: null });
    expect(snapshots.rows.size).toBe(2);
    expect(rounds[1]!.scheduledStartAt.getTime()).toBeGreaterThan(
      rounds[0]!.scheduledStartAt.getTime(),
    );
  });

  it.each([
    [0, "under the minimum"],
    [5, "over half the Teams"],
    [1.5, "not a whole number"],
  ])("rejects %s rounds (%s)", async (rounds) => {
    const { useCase } = generationUseCase({ source: swissSource(8) });
    const outcome = await useCase.execute({ ...generationInput(), swiss: { rounds } });
    expect(outcome.isErr() && outcome.error.code).toBe("scheduling.invalid_fixture_configuration");
  });

  it("accepts the maximum", async () => {
    const { useCase } = generationUseCase({ source: swissSource(8) });
    const outcome = await useCase.execute({ ...generationInput(), swiss: { rounds: 4 } });
    expect(outcome.isOk() && swissRounds(outcome.value)).toHaveLength(4);
  });

  it("rejects home and away", async () => {
    const { useCase } = generationUseCase({ source: swissSource(8) });
    const outcome = await useCase.execute({ ...generationInput(), homeAndAway: true });
    expect(outcome.isErr() && outcome.error.code).toBe("scheduling.invalid_fixture_configuration");
  });

  it("rejects a round count on another format", async () => {
    const { useCase } = generationUseCase();
    const outcome = await useCase.execute({ ...generationInput(), swiss: { rounds: 1 } });
    expect(outcome.isErr() && outcome.error.code).toBe("scheduling.invalid_fixture_configuration");
  });

  it("treats a different round count as a different generation", async () => {
    const fixtures = new FixturePlans();
    const { useCase } = generationUseCase({ fixtures, source: swissSource(8) });
    await useCase.execute({ ...generationInput(), swiss: { rounds: 3 } });
    const outcome = await useCase.execute({ ...generationInput(), swiss: { rounds: 4 } });
    expect(outcome.isErr() && outcome.error.code).toBe("scheduling.fixture_generation_conflict");
  });
});
