import { asOfficialMatchSlotId, type EncounterId, type TeamId } from "@futrob/shared-kernel";
import type {
  FixtureEncounter,
  FixtureParticipantSlot,
  FixturePlaceholderSlot,
  FixturePlan,
  FixtureSeries,
  SeriesResolutionMode,
} from "../entities/fixture-plan.ts";
import type { OfficialEncounterScore } from "../ports/official-encounter-score-reader.port.ts";
import { planEncounters } from "./edit-fixture-encounter.ts";

export interface StandingPoints {
  readonly winPoints: number;
  readonly drawPoints: number;
  readonly lossPoints: number;
}

export interface FixtureAdvancementInput {
  readonly plan: FixturePlan;
  readonly scores: ReadonlyMap<EncounterId, OfficialEncounterScore>;
  readonly standingPoints: StandingPoints;
  /** Series mode for an Encounter that becomes Team vs Team through advancement. */
  readonly advancedResolutionMode: SeriesResolutionMode;
}

export interface FixtureAdvancementChange {
  readonly before: FixtureEncounter;
  readonly after: FixtureEncounter;
}

export interface FixtureAdvancement {
  readonly changes: readonly FixtureAdvancementChange[];
  /** Placeholders whose source is final but tied without configured tie-break data (DEC-017). */
  readonly ties: readonly FixturePlaceholderSlot[];
}

type Resolution =
  | { readonly status: "pending" }
  | { readonly status: "tie" }
  | { readonly status: "team"; readonly teamId: TeamId };

const PENDING: Resolution = { status: "pending" };
const TIE: Resolution = { status: "tie" };

/**
 * Derives every advanced slot of the plan from the approved official scores. The result
 * depends only on current state, so repeating it converges and a void restores placeholders.
 */
export function reconcileFixtureAdvancement(input: FixtureAdvancementInput): FixtureAdvancement {
  const byId = new Map<EncounterId, FixtureEncounter>();
  for (const encounter of planEncounters(input.plan)) byId.set(encounter.id, encounter);
  const desired = new Map<EncounterId, FixtureEncounter>();
  const ties: FixturePlaceholderSlot[] = [];

  const desiredEncounter = (encounter: FixtureEncounter): FixtureEncounter => {
    const known = desired.get(encounter.id);
    if (known) return known;
    const home = desiredSlot(encounter.home);
    const away = desiredSlot(encounter.away);
    const concrete = home.kind === "team" && away.kind === "team";
    const next: FixtureEncounter = {
      ...encounter,
      home,
      away,
      series: concrete
        ? (encounter.series ?? newSeries(encounter, input.advancedResolutionMode))
        : null,
    };
    desired.set(encounter.id, next);
    return next;
  };

  const desiredSlot = (slot: FixtureParticipantSlot): FixtureParticipantSlot => {
    const placeholder = placeholderOf(slot);
    if (!placeholder) return slot;
    const resolution = resolve(placeholder);
    if (resolution.status === "team") {
      return { kind: "team", teamId: resolution.teamId, advancedFrom: placeholder };
    }
    if (resolution.status === "tie") ties.push(placeholder);
    return placeholder;
  };

  const resolve = (placeholder: FixturePlaceholderSlot): Resolution => {
    switch (placeholder.kind) {
      case "winner": {
        const source = byId.get(placeholder.encounterId);
        return source ? encounterWinner(desiredEncounter(source), input.scores) : PENDING;
      }
      case "group-rank":
        return rankedTeam(
          [...byId.values()]
            .filter(
              (encounter) =>
                encounter.stageId === placeholder.stageId &&
                encounter.groupId === placeholder.groupId,
            )
            .map(desiredEncounter),
          placeholder.rank,
          input,
        );
      case "stage-rank":
        return rankedTeam(
          [...byId.values()]
            .filter((encounter) => encounter.stageId === placeholder.stageId)
            .map(desiredEncounter),
          placeholder.rank,
          input,
        );
    }
  };

  const changes: FixtureAdvancementChange[] = [];
  for (const before of byId.values()) {
    const after = desiredEncounter(before);
    if (
      slotKey(before.home) !== slotKey(after.home) ||
      slotKey(before.away) !== slotKey(after.away) ||
      (before.series === null) !== (after.series === null)
    ) {
      changes.push({ before, after });
    }
  }
  return { changes, ties };
}

export function placeholderOf(slot: FixtureParticipantSlot): FixturePlaceholderSlot | null {
  switch (slot.kind) {
    case "team":
      return slot.advancedFrom ?? null;
    case "bye":
      return null;
    case "winner":
    case "group-rank":
    case "stage-rank":
      return slot;
  }
}

export function hasAdvancementSlots(plan: FixturePlan): boolean {
  for (const encounter of planEncounters(plan)) {
    if (placeholderOf(encounter.home) || placeholderOf(encounter.away)) return true;
  }
  return false;
}

/** True when the placeholder's outcome depends on the given Encounter's result. */
export function placeholderDependsOn(
  placeholder: FixturePlaceholderSlot,
  encounter: FixtureEncounter,
): boolean {
  switch (placeholder.kind) {
    case "winner":
      return placeholder.encounterId === encounter.id;
    case "group-rank":
      return placeholder.stageId === encounter.stageId && placeholder.groupId === encounter.groupId;
    case "stage-rank":
      return placeholder.stageId === encounter.stageId;
  }
}

function encounterWinner(
  encounter: FixtureEncounter,
  scores: ReadonlyMap<EncounterId, OfficialEncounterScore>,
): Resolution {
  const { home, away } = encounter;
  if (home.kind === "team" && away.kind === "bye") return { status: "team", teamId: home.teamId };
  if (home.kind === "bye" && away.kind === "team") return { status: "team", teamId: away.teamId };
  if (home.kind !== "team" || away.kind !== "team" || !encounter.series) return PENDING;
  const score = scores.get(encounter.id);
  if (!score) return PENDING;

  let homeValue = 0;
  let awayValue = 0;
  for (const slot of score.slots) {
    switch (encounter.series.resolutionMode) {
      case "aggregate_score":
        homeValue += slot.homeGoals;
        awayValue += slot.awayGoals;
        break;
      case "independent_matches":
        homeValue += Number(slot.homeGoals > slot.awayGoals);
        awayValue += Number(slot.awayGoals > slot.homeGoals);
        break;
    }
  }
  if (homeValue === awayValue) return TIE;
  return { status: "team", teamId: homeValue > awayValue ? home.teamId : away.teamId };
}

interface StandingRow {
  readonly teamId: TeamId;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
}

/**
 * Ranks a group or stage once every Team vs Team Encounter in it has an approved result.
 * Order: points, goal difference, goals for. A tie that touches the requested rank goes to
 * organizer review instead of an implicit order (DEC-014 continues with criteria not modeled).
 */
function rankedTeam(
  encounters: readonly FixtureEncounter[],
  rank: number,
  input: FixtureAdvancementInput,
): Resolution {
  const rows = new Map<TeamId, StandingRow>();
  const row = (teamId: TeamId): StandingRow => {
    const existing = rows.get(teamId);
    if (existing) return existing;
    const created = { teamId, points: 0, goalsFor: 0, goalsAgainst: 0 };
    rows.set(teamId, created);
    return created;
  };
  const record = (home: StandingRow, away: StandingRow, homeGoals: number, awayGoals: number) => {
    const { winPoints, drawPoints, lossPoints } = input.standingPoints;
    home.goalsFor += homeGoals;
    home.goalsAgainst += awayGoals;
    away.goalsFor += awayGoals;
    away.goalsAgainst += homeGoals;
    home.points +=
      homeGoals > awayGoals ? winPoints : homeGoals === awayGoals ? drawPoints : lossPoints;
    away.points +=
      awayGoals > homeGoals ? winPoints : homeGoals === awayGoals ? drawPoints : lossPoints;
  };

  for (const encounter of encounters) {
    const { home, away, series } = encounter;
    if (home.kind !== "team" || away.kind !== "team" || !series) {
      if (placeholderOf(home) || placeholderOf(away)) return PENDING;
      continue;
    }
    const score = input.scores.get(encounter.id);
    if (!score) return PENDING;
    const homeRow = row(home.teamId);
    const awayRow = row(away.teamId);
    if (series.resolutionMode === "aggregate_score") {
      record(
        homeRow,
        awayRow,
        score.slots.reduce((total, slot) => total + slot.homeGoals, 0),
        score.slots.reduce((total, slot) => total + slot.awayGoals, 0),
      );
      continue;
    }
    for (const slot of score.slots) record(homeRow, awayRow, slot.homeGoals, slot.awayGoals);
  }

  const table = [...rows.values()].sort(
    (left, right) =>
      right.points - left.points ||
      right.goalsFor - right.goalsAgainst - (left.goalsFor - left.goalsAgainst) ||
      right.goalsFor - left.goalsFor,
  );
  const ranked = table[rank - 1];
  if (!ranked) return PENDING;
  const sameStanding = (other: StandingRow | undefined) =>
    other !== undefined &&
    other.points === ranked.points &&
    other.goalsFor === ranked.goalsFor &&
    other.goalsAgainst - other.goalsFor === ranked.goalsAgainst - ranked.goalsFor;
  if (sameStanding(table[rank - 2]) || sameStanding(table[rank])) return TIE;
  return { status: "team", teamId: ranked.teamId };
}

function newSeries(
  encounter: FixtureEncounter,
  resolutionMode: SeriesResolutionMode,
): FixtureSeries {
  const slots: readonly (1 | 2)[] = encounter.officialMatchCount === 1 ? [1] : [1, 2];
  return {
    id: `${encounter.id}:series`,
    resolutionMode,
    officialMatches: slots.map((slot) => ({
      id: asOfficialMatchSlotId(`${encounter.id}:official-match:${slot}`),
      slot,
    })),
  };
}

function slotKey(slot: FixtureParticipantSlot): string {
  switch (slot.kind) {
    case "team": {
      const origin = slot.advancedFrom ? slotKey(slot.advancedFrom) : "";
      return `team:${slot.teamId}:${origin}`;
    }
    case "bye":
      return "bye";
    case "winner":
      return `winner:${slot.encounterId}`;
    case "group-rank":
      return `group-rank:${slot.stageId}:${slot.groupId}:${slot.rank}`;
    case "stage-rank":
      return `stage-rank:${slot.stageId}:${slot.rank}`;
  }
}
