import {
  asActorId,
  asCompetitionId,
  asOrganizationId,
  asTeamId,
  type AuthorizationPort,
  type DomainEvent,
  type EncounterId,
} from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import type { EncounterScheduleSnapshot } from "../domain/entities/encounter-schedule-snapshot.ts";
import type { FixturePlan } from "../domain/entities/fixture-plan.ts";
import type { OfficialMatch } from "../domain/entities/official-match.ts";
import type { FixtureAuditEntry } from "../domain/ports/fixture-editing.ports.ts";
import type { EncounterScheduleRepository } from "../domain/ports/encounter-schedule.repository.ts";
import type { OfficialMatchRepository } from "../domain/ports/official-match.repository.ts";
import { generateFixturePlan } from "../domain/policies/generate-fixture-plan.ts";
import { EditFixtureEncounterUseCase } from "./edit-fixture-encounter.use-case.ts";

const organizationId = asOrganizationId("org-1");
const competitionId = asCompetitionId("competition-1");
const seed = [asTeamId("team-a"), asTeamId("team-b"), asTeamId("team-c")];
const original = generateFixturePlan({
  organizationId,
  competitionId,
  generationVersion: 1,
  rulesVersion: 1,
  format: "league",
  timeZone: "America/Lima",
  startsAt: new Date("2026-09-01T01:00:00.000Z"),
  roundIntervalDays: 7,
  officialMatchCounts: { regular: 1, knockout: 2 },
  resolutionModes: { regular: "independent_matches", knockout: "aggregate_score" },
  seed,
  homeAndAway: false,
});

function authorization(allowed = true): AuthorizationPort {
  return {
    decide: async (request) => ({ ...request, allowed, reason: allowed ? "allowed" : "denied" }),
    getEffectiveAccess: async (input) => ({ ...input, roles: [], permissions: [] }),
  };
}

class Snapshots implements EncounterScheduleRepository {
  readonly rows = new Map<EncounterId, EncounterScheduleSnapshot>();
  async findById(encounterId: EncounterId) {
    return this.rows.get(encounterId) ?? null;
  }
  async upsert(snapshot: EncounterScheduleSnapshot) {
    this.rows.set(snapshot.encounterId, snapshot);
    return snapshot;
  }
  async deleteByEncounterIds(encounterIds: readonly EncounterId[]) {
    for (const encounterId of encounterIds) this.rows.delete(encounterId);
  }
}

class Matches implements OfficialMatchRepository {
  async listByEncounter() {
    return [] as OfficialMatch[];
  }
  async upsertMany() {}
  async voidByEncounterIds() {}
}

function createUseCase(input: {
  readonly plan?: FixturePlan;
  readonly audits?: FixtureAuditEntry[];
  readonly events?: DomainEvent[];
  readonly canEdit?: boolean;
}) {
  let stored = input.plan ?? original;
  const audits = input.audits ?? [];
  const events = input.events ?? [];
  const snapshots = new Snapshots();
  return {
    get stored() {
      return stored;
    },
    audits,
    events,
    snapshots,
    useCase: new EditFixtureEncounterUseCase({
      authorization: authorization(),
      audit: {
        findByRequestId: async (_organizationId, _competitionId, requestId) =>
          audits.find((entry) => entry.requestId === requestId) ?? null,
        append: async (entry) => void audits.push(entry),
      },
      clock: { now: () => new Date("2026-08-11T22:00:00.000Z") },
      editGuard: { canEdit: async () => input.canEdit ?? true },
      encounters: snapshots,
      eventPublisher: {
        publish: async (event) => void events.push(event),
        publishMany: async (batch) => void events.push(...batch),
      },
      fixtures: {
        findById: async () => stored,
        findByGenerationVersion: async () => stored,
        listActive: async () => [stored],
        save: async (plan) => ({ plan, created: true }),
        updateEncounter: async ({ revision, encounter }) => {
          if (revision !== stored.revision) return null;
          stored = {
            ...stored,
            revision: stored.revision + 1,
            stages: stored.stages.map((stage) => ({
              ...stage,
              rounds: stage.rounds.map((round) => ({
                ...round,
                encounters: round.encounters.map((item) =>
                  item.id === encounter.id ? encounter : item,
                ),
              })),
            })),
          };
          return stored;
        },
        markSuperseded: async () => {},
        containsEncounter: async () => true,
      },
      matches: new Matches(),
      mutationLock: { runExclusive: async (_encounterId, operation) => operation() },
      source: {
        load: async () => ({
          organizationId,
          competitionId,
          status: "published",
          format: "league",
          timeZone: "America/Lima",
          rulesVersion: 1,
          officialMatchCounts: { regular: 1, knockout: 2 },
          resolutionModes: { regular: "independent_matches", knockout: "aggregate_score" },
          approvedParticipants: seed,
        }),
      },
      transaction: { runInTransaction: async (operation) => operation() },
    }),
  };
}

describe("EditFixtureEncounterUseCase", () => {
  it("reschedules a pending encounter, bumps revision, and records one audit entry", async () => {
    const encounter = original.stages
      .flatMap((stage) => stage.rounds.flatMap((round) => round.encounters))
      .find((item) => item.home.kind === "team" && item.away.kind === "team");
    expect(encounter).toBeDefined();
    if (!encounter) return;
    const harness = createUseCase({});

    const changed = await harness.useCase.execute({
      actorId: asActorId("staff-1"),
      organizationId,
      competitionId,
      fixturePlanId: original.id,
      encounterId: encounter.id,
      scheduledStartAt: new Date("2026-09-02T01:00:00.000Z"),
      reason: "Broadcast window",
      requestId: "request-1",
    });
    const replay = await harness.useCase.execute({
      actorId: asActorId("staff-1"),
      organizationId,
      competitionId,
      fixturePlanId: original.id,
      encounterId: encounter.id,
      scheduledStartAt: new Date("2026-09-03T01:00:00.000Z"),
      reason: "Conflicting retry payload",
      requestId: "request-1",
    });

    expect(changed.isOk()).toBe(true);
    expect(replay.isOk()).toBe(true);
    expect(
      replay.isOk() &&
        replay.value.stages
          .flatMap((stage) => stage.rounds.flatMap((round) => round.encounters))
          .find((item) => item.id === encounter.id)
          ?.scheduledStartAt.toISOString(),
    ).toBe("2026-09-02T01:00:00.000Z");
    expect(harness.audits).toHaveLength(1);
    expect(harness.stored.revision).toBe(2);
    expect(harness.events.map((event) => event.eventName)).toEqual([
      "scheduling.encounter-rescheduled",
    ]);
    expect(await harness.snapshots.findById(encounter.id)).toMatchObject({
      scheduledStartAt: new Date("2026-09-02T01:00:00.000Z"),
    });
  });

  it("rejects team-vs-bye reschedules that collide with another encounter", async () => {
    const firstRound = original.stages[0]?.rounds[0];
    const secondRound = original.stages[0]?.rounds[1];
    const byeEncounter = firstRound?.encounters.find(
      (encounter) => encounter.home.kind === "bye" || encounter.away.kind === "bye",
    );
    expect(byeEncounter).toBeDefined();
    expect(secondRound).toBeDefined();
    if (!byeEncounter || !secondRound) return;
    const byeTeamId =
      byeEncounter.home.kind === "team"
        ? byeEncounter.home.teamId
        : byeEncounter.away.kind === "team"
          ? byeEncounter.away.teamId
          : null;
    expect(byeTeamId).toBeTruthy();
    const laterWithSameTeam = secondRound.encounters.find(
      (encounter) =>
        (encounter.home.kind === "team" && encounter.home.teamId === byeTeamId) ||
        (encounter.away.kind === "team" && encounter.away.teamId === byeTeamId),
    );
    expect(laterWithSameTeam).toBeDefined();
    if (!laterWithSameTeam) return;
    const harness = createUseCase({});

    const result = await harness.useCase.execute({
      actorId: asActorId("staff-1"),
      organizationId,
      competitionId,
      fixturePlanId: original.id,
      encounterId: byeEncounter.id,
      scheduledStartAt: laterWithSameTeam.scheduledStartAt,
      reason: "Overlap",
      requestId: "request-bye-collision",
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) return;
    expect(result.error.code).toBe("scheduling.invalid_fixture_configuration");
    expect(harness.audits).toHaveLength(0);
  });

  it("rejects a pairing that already exists elsewhere in the fixture", async () => {
    const first = original.stages[0]?.rounds[0]?.encounters.find(
      (encounter) => encounter.home.kind === "team" && encounter.away.kind === "team",
    );
    const other = original.stages
      .flatMap((stage) => stage.rounds.flatMap((round) => round.encounters))
      .find(
        (encounter) =>
          encounter.id !== first?.id &&
          encounter.home.kind === "team" &&
          encounter.away.kind === "team",
      );
    expect(first).toBeDefined();
    expect(other).toBeDefined();
    if (!first || !other || other.home.kind !== "team" || other.away.kind !== "team") return;
    const harness = createUseCase({});

    const result = await harness.useCase.execute({
      actorId: asActorId("staff-1"),
      organizationId,
      competitionId,
      fixturePlanId: original.id,
      encounterId: first.id,
      homeTeamId: other.home.teamId,
      awayTeamId: other.away.teamId,
      reason: "Duplicate pairing",
      requestId: "request-duplicate",
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) return;
    expect(result.error.code).toBe("scheduling.invalid_fixture_configuration");
  });

  it("rejects pairing edits that replace placeholder slots", async () => {
    const knockout = generateFixturePlan({
      organizationId,
      competitionId,
      generationVersion: 1,
      rulesVersion: 1,
      format: "knockout",
      timeZone: "America/Lima",
      startsAt: new Date("2026-09-01T01:00:00.000Z"),
      roundIntervalDays: 7,
      officialMatchCounts: { regular: 1, knockout: 2 },
      resolutionModes: { regular: "independent_matches", knockout: "aggregate_score" },
      seed: [asTeamId("team-a"), asTeamId("team-b"), asTeamId("team-c")],
      homeAndAway: false,
    });
    const placeholder = knockout.stages[0]?.rounds[0]?.encounters.find(
      (encounter) => encounter.home.kind === "bye" || encounter.away.kind === "bye",
    );
    expect(placeholder).toBeDefined();
    if (!placeholder) return;
    const harness = createUseCase({ plan: knockout });

    const result = await harness.useCase.execute({
      actorId: asActorId("staff-1"),
      organizationId,
      competitionId,
      fixturePlanId: knockout.id,
      encounterId: placeholder.id,
      homeTeamId: asTeamId("team-a"),
      awayTeamId: asTeamId("team-b"),
      reason: "Manual pairing",
      requestId: "request-placeholder",
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) return;
    expect(result.error.code).toBe("scheduling.invalid_fixture_configuration");
  });

  it("rejects an encounter with official results", async () => {
    const encounter = original.stages[0]?.rounds[0]?.encounters[0];
    expect(encounter).toBeDefined();
    if (!encounter) return;
    const harness = createUseCase({ canEdit: false });
    const result = await harness.useCase.execute({
      actorId: asActorId("staff-1"),
      organizationId,
      competitionId,
      fixturePlanId: original.id,
      encounterId: encounter.id,
      scheduledStartAt: new Date("2026-09-02T01:00:00.000Z"),
      reason: "Too late",
      requestId: "request-2",
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) return;
    expect(result.error.code).toBe("scheduling.fixture_encounter_not_editable");
  });

  it("does not turn a bye into an unaudited series through manual pairing edit", async () => {
    const plan = generateFixturePlan({
      organizationId,
      competitionId,
      generationVersion: 2,
      rulesVersion: 1,
      format: "league",
      timeZone: "America/Lima",
      startsAt: new Date("2026-09-01T01:00:00.000Z"),
      roundIntervalDays: 7,
      officialMatchCounts: { regular: 1, knockout: 2 },
      resolutionModes: { regular: "independent_matches", knockout: "aggregate_score" },
      seed,
      homeAndAway: false,
    });
    const bye = plan.stages[0]?.rounds[0]?.encounters.find(
      (encounter) => encounter.home.kind === "bye" || encounter.away.kind === "bye",
    );
    expect(bye).toBeDefined();
    if (!bye) return;

    const result = await new EditFixtureEncounterUseCase({
      authorization: authorization(),
      audit: { findByRequestId: async () => null, append: async () => {} },
      clock: { now: () => new Date() },
      editGuard: { canEdit: async () => true },
      encounters: new Snapshots(),
      eventPublisher: { publish: async () => {}, publishMany: async () => {} },
      fixtures: {
        findById: async () => plan,
        findByGenerationVersion: async () => plan,
        listActive: async () => [plan],
        save: async () => ({ plan, created: false }),
        updateEncounter: async () => plan,
        markSuperseded: async () => {},
        containsEncounter: async () => true,
      },
      matches: new Matches(),
      mutationLock: { runExclusive: async (_encounterId, operation) => operation() },
      source: { load: async () => null },
      transaction: { runInTransaction: async (operation) => operation() },
    }).execute({
      actorId: asActorId("staff-1"),
      organizationId,
      competitionId,
      fixturePlanId: plan.id,
      encounterId: bye.id,
      homeTeamId: asTeamId("team-a"),
      awayTeamId: asTeamId("team-b"),
      reason: "Replace bye",
      requestId: "request-bye",
    });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) return;
    expect(result.error.code).toBe("scheduling.invalid_fixture_configuration");
  });
});
