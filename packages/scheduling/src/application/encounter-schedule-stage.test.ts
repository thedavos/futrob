import { asTeamId, type DomainEvent } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import type { EncounterCreatedEvent } from "../domain/events/encounter-created.event.ts";
import { input, source, useCase } from "./generate-competition-fixture.test-harness.ts";

const fourTeams = [
  asTeamId("team-a"),
  asTeamId("team-b"),
  asTeamId("team-c"),
  asTeamId("team-d"),
] as const;

async function generate(format: "league-playoffs" | "knockout") {
  const events: DomainEvent[] = [];
  const harness = useCase({
    events,
    source: source({
      format,
      rulesVersion: 1,
      officialMatchCounts: { regular: 2, knockout: 1 },
      approvedParticipants: [...fourTeams],
    }),
  });
  const result = await harness.useCase.execute({
    ...input(),
    homeAndAway: true,
    playoffs: format === "league-playoffs" ? { teamCount: 4 } : undefined,
    requestId: "request-stage",
  });
  expect(result.isOk()).toBe(true);
  if (result.isErr()) throw result.error;
  return { plan: result.value, snapshots: harness.snapshots, events: harness.events };
}

describe("encounter schedule stage", () => {
  it("stage-regular-playoffs-league-leg", async () => {
    const { plan, snapshots } = await generate("league-playoffs");
    const league = plan.stages.find((stage) => stage.kind === "league");
    expect(league).toBeDefined();
    const leagueEncounter = league?.rounds[0]?.encounters.find(
      (encounter) => encounter.home.kind === "team" && encounter.away.kind === "team",
    );
    expect(leagueEncounter).toBeDefined();
    if (!league || !leagueEncounter) return;
    expect(await snapshots.findById(leagueEncounter.id)).toMatchObject({
      stageId: league.id,
      officialMatchCount: 2,
    });
  });

  it("stage-playoff-encounter", async () => {
    const { plan, snapshots } = await generate("knockout");
    const knockout = plan.stages.find((stage) => stage.kind === "knockout");
    expect(knockout).toBeDefined();
    const playoffEncounter = knockout?.rounds[0]?.encounters.find(
      (encounter) => encounter.home.kind === "team" && encounter.away.kind === "team",
    );
    expect(playoffEncounter).toBeDefined();
    if (!knockout || !playoffEncounter) return;
    expect(await snapshots.findById(playoffEncounter.id)).toMatchObject({
      stageId: knockout.id,
    });
  });

  it("stage-not-only-on-event", async () => {
    const { plan, snapshots, events } = await generate("league-playoffs");
    const created = events.filter(
      (event): event is EncounterCreatedEvent => event.eventName === "scheduling.encounter-created",
    );
    expect(created.length).toBeGreaterThan(0);
    for (const event of created) {
      const encounter = plan.stages
        .flatMap((stage) => stage.rounds.flatMap((round) => round.encounters))
        .find((item) => item.id === event.payload.encounterId);
      expect(encounter).toBeDefined();
      if (!encounter) return;
      const snapshot = await snapshots.findById(encounter.id);
      expect(snapshot?.stageId).toBe(event.payload.stageId);
      expect(snapshot?.stageId).toBeTruthy();
    }
    const leftover = plan.stages
      .flatMap((stage) => stage.rounds.flatMap((round) => round.encounters))
      .find((encounter) => encounter.home.kind === "team" && encounter.away.kind === "team");
    expect(leftover).toBeDefined();
    if (!leftover) return;
    expect((await snapshots.findById(leftover.id))?.stageId).toBe(leftover.stageId);
  });
});
