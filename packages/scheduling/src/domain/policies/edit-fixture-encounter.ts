import type { EncounterId, TeamId } from "@futrob/shared-kernel";
import type {
  FixtureEncounter,
  FixtureParticipantSlot,
  FixturePlan,
} from "../entities/fixture-plan.ts";

export function findEncounter(
  plan: FixturePlan,
  encounterId: EncounterId,
): FixtureEncounter | null {
  for (const encounter of planEncounters(plan)) {
    if (encounter.id === encounterId) return encounter;
  }
  return null;
}

export function replaceEncounter(plan: FixturePlan, replacement: FixtureEncounter): FixturePlan {
  return {
    ...plan,
    stages: plan.stages.map((stage) => ({
      ...stage,
      rounds: stage.rounds.map((round) => ({
        ...round,
        encounters: round.encounters.map((encounter) =>
          encounter.id === replacement.id ? replacement : encounter,
        ),
      })),
    })),
  };
}

export function hasTeamCollision(plan: FixturePlan, candidate: FixtureEncounter): boolean {
  const teams = teamIdsFromSlots(candidate.home, candidate.away);
  if (teams.size === 0) return false;
  const at = candidate.scheduledStartAt.getTime();
  for (const encounter of planEncounters(plan)) {
    if (encounter.id === candidate.id) continue;
    if (encounter.scheduledStartAt.getTime() !== at) continue;
    for (const teamId of teamIdsFromSlots(encounter.home, encounter.away)) {
      if (teams.has(teamId)) return true;
    }
  }
  return false;
}

export function hasDuplicateMatchup(plan: FixturePlan, candidate: FixtureEncounter): boolean {
  if (candidate.home.kind !== "team" || candidate.away.kind !== "team") return false;
  const home = candidate.home.teamId;
  const away = candidate.away.teamId;
  for (const encounter of planEncounters(plan)) {
    if (encounter.id === candidate.id) continue;
    if (encounter.home.kind !== "team" || encounter.away.kind !== "team") continue;
    if (encounter.home.teamId === home && encounter.away.teamId === away) return true;
    if (!plan.homeAndAway && encounter.home.teamId === away && encounter.away.teamId === home) {
      return true;
    }
  }
  return false;
}

export function teamsInGroup(plan: FixturePlan, groupId: string): Set<TeamId> {
  const teams = new Set<TeamId>();
  for (const encounter of planEncounters(plan)) {
    if (encounter.groupId !== groupId) continue;
    for (const teamId of teamIdsFromSlots(encounter.home, encounter.away)) {
      teams.add(teamId);
    }
  }
  return teams;
}

export function* planEncounters(plan: FixturePlan): Generator<FixtureEncounter> {
  for (const stage of plan.stages) {
    for (const round of stage.rounds) {
      yield* round.encounters;
    }
  }
}

export function teamIdsFromSlots(...slots: FixtureParticipantSlot[]): Set<TeamId> {
  const teams = new Set<TeamId>();
  for (const slot of slots) {
    if (slot.kind === "team") teams.add(slot.teamId);
  }
  return teams;
}

export function encountersEqual(left: FixtureEncounter, right: FixtureEncounter): boolean {
  return (
    left.scheduledStartAt.getTime() === right.scheduledStartAt.getTime() &&
    slotsEqual(left.home, right.home) &&
    slotsEqual(left.away, right.away)
  );
}

function slotsEqual(left: FixtureParticipantSlot, right: FixtureParticipantSlot): boolean {
  if (left.kind !== right.kind) return false;
  switch (left.kind) {
    case "team":
      return right.kind === "team" && left.teamId === right.teamId;
    case "bye":
      return true;
    case "winner":
      return right.kind === "winner" && left.encounterId === right.encounterId;
    case "group-rank":
      return (
        right.kind === "group-rank" &&
        left.stageId === right.stageId &&
        left.groupId === right.groupId &&
        left.rank === right.rank
      );
    case "stage-rank":
      return (
        right.kind === "stage-rank" && left.stageId === right.stageId && left.rank === right.rank
      );
    default: {
      const _exhaustive: never = left;
      return _exhaustive;
    }
  }
}
