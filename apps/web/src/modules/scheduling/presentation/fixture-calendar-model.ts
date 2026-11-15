import type {
  CompetitionFixtureView,
  FixtureEncounterView,
  FixtureRoundName,
  FixtureStageKind,
} from "./competition-fixture-view.ts";
import { monthOf, zonedDateKey, type DateKey, type MonthKey } from "./fixture-calendar-dates.ts";

/** One Encounter placed on the calendar: its round, stage and local day. */
export type FixtureCalendarEntry = {
  readonly encounter: FixtureEncounterView;
  readonly stageId: string;
  readonly stageKind: FixtureStageKind;
  readonly roundId: string;
  readonly roundName: FixtureRoundName;
  readonly date: DateKey;
};

export type FixtureCalendarTeam = { readonly teamId: string; readonly name: string | null };

export type FixtureCalendarRound = {
  readonly id: string;
  readonly stageKind: FixtureStageKind;
  readonly name: FixtureRoundName;
};

export type FixtureCalendarFilters = {
  /** null shows every Team. */
  readonly teamId: string | null;
  /** null shows every round. */
  readonly roundId: string | null;
};

export const NO_FIXTURE_FILTERS: FixtureCalendarFilters = { teamId: null, roundId: null };

export function hasFixtureFilters(filters: FixtureCalendarFilters): boolean {
  return filters.teamId !== null || filters.roundId !== null;
}

/** Every Encounter in kickoff order; ties keep the fixture's stage, round and order. */
export function fixtureCalendarEntries(view: CompetitionFixtureView): FixtureCalendarEntry[] {
  const entries = view.stages.flatMap((stage) =>
    stage.rounds.flatMap((round) =>
      round.encounters.map((encounter) => ({
        encounter,
        stageId: stage.id,
        stageKind: stage.kind,
        roundId: round.id,
        roundName: round.name,
        date: zonedDateKey(encounter.scheduledStartAt, view.timeZone),
      })),
    ),
  );
  const kickoff = new Map(
    entries.map((entry) => [entry, Date.parse(entry.encounter.scheduledStartAt)]),
  );
  // Array.prototype.sort is stable, so equal kickoffs keep the fixture's order.
  return entries.sort((left, right) => (kickoff.get(left) ?? 0) - (kickoff.get(right) ?? 0));
}

/** Teams the fixture already names, for the Team filter. Open slots are not Teams yet. */
export function fixtureCalendarTeams(
  view: CompetitionFixtureView,
  locale: string,
): FixtureCalendarTeam[] {
  const teams = new Map<string, FixtureCalendarTeam>();
  for (const stage of view.stages) {
    for (const round of stage.rounds) {
      for (const encounter of round.encounters) {
        for (const side of [encounter.home, encounter.away]) {
          if (side.kind === "team" && !teams.has(side.teamId)) {
            teams.set(side.teamId, { teamId: side.teamId, name: side.name });
          }
        }
      }
    }
  }
  const collator = new Intl.Collator(locale, { sensitivity: "base" });
  // Unnamed Teams sort last; they still filter, under the generic unavailable label.
  return [...teams.values()].sort((left, right) => {
    if (left.name === null || right.name === null) {
      return Number(left.name === null) - Number(right.name === null);
    }
    return collator.compare(left.name, right.name);
  });
}

export function fixtureCalendarRounds(view: CompetitionFixtureView): FixtureCalendarRound[] {
  return view.stages.flatMap((stage) =>
    stage.rounds.map((round) => ({ id: round.id, stageKind: stage.kind, name: round.name })),
  );
}

/**
 * Filters that still point at this fixture. A refresh can drop a Team or a round the
 * reader had chosen; the filter then falls back to everything instead of showing nothing.
 */
export function validFixtureFilters(
  filters: FixtureCalendarFilters,
  teams: readonly FixtureCalendarTeam[],
  rounds: readonly FixtureCalendarRound[],
): FixtureCalendarFilters {
  return {
    teamId: teams.some((team) => team.teamId === filters.teamId) ? filters.teamId : null,
    roundId: rounds.some((round) => round.id === filters.roundId) ? filters.roundId : null,
  };
}

export function filterFixtureEntries(
  entries: readonly FixtureCalendarEntry[],
  filters: FixtureCalendarFilters,
): FixtureCalendarEntry[] {
  return entries.filter(
    (entry) =>
      (filters.roundId === null || entry.roundId === filters.roundId) &&
      (filters.teamId === null || playsIn(entry.encounter, filters.teamId)),
  );
}

function playsIn(encounter: FixtureEncounterView, teamId: string): boolean {
  return [encounter.home, encounter.away].some(
    (side) => side.kind === "team" && side.teamId === teamId,
  );
}

export type FixtureCalendarDay = {
  readonly date: DateKey;
  readonly entries: readonly FixtureCalendarEntry[];
};

/** Entries grouped by local day, in calendar order. Expects kickoff-ordered entries. */
export function fixtureCalendarDays(
  entries: readonly FixtureCalendarEntry[],
): FixtureCalendarDay[] {
  const days = new Map<DateKey, FixtureCalendarEntry[]>();
  for (const entry of entries) {
    const day = days.get(entry.date);
    if (day) day.push(entry);
    else days.set(entry.date, [entry]);
  }
  return [...days.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, dayEntries]) => ({ date, entries: dayEntries }));
}

/** The first day with Encounters from `today` on, or null once the fixture is behind. */
export function nextFixtureDate(
  entries: readonly FixtureCalendarEntry[],
  today: DateKey,
): DateKey | null {
  let next: DateKey | null = null;
  for (const entry of entries) {
    if (entry.date >= today && (next === null || entry.date < next)) next = entry.date;
  }
  return next;
}

/**
 * Where the calendar opens: the month of the next date, else the last month with
 * Encounters, else the current month.
 */
export function initialFixtureMonth(
  entries: readonly FixtureCalendarEntry[],
  today: DateKey,
): MonthKey {
  const next = nextFixtureDate(entries, today);
  if (next) return monthOf(next);
  const last = entries.reduce<DateKey | null>(
    (latest, entry) => (latest === null || entry.date > latest ? entry.date : latest),
    null,
  );
  return monthOf(last ?? today);
}

/** The day the month view selects first: the next date in that month, else its first date. */
export function defaultFixtureDay(
  days: readonly FixtureCalendarDay[],
  month: MonthKey,
  today: DateKey,
): DateKey | null {
  const inMonth = days.filter((day) => monthOf(day.date) === month);
  return (inMonth.find((day) => day.date >= today) ?? inMonth[0])?.date ?? null;
}

/** The nearest month before or after `month` that has Encounters, if any. */
export function adjacentFixtureMonth(
  days: readonly FixtureCalendarDay[],
  month: MonthKey,
  direction: "previous" | "next",
): MonthKey | null {
  const months = [...new Set(days.map((day) => monthOf(day.date)))].sort();
  if (direction === "next") return months.find((candidate) => candidate > month) ?? null;
  return months.filter((candidate) => candidate < month).at(-1) ?? null;
}

export type FixtureRoundColumn = {
  readonly id: string;
  readonly name: FixtureRoundName;
  /** First and last local day of the whole round, unaffected by filters. */
  readonly firstDate: DateKey | null;
  readonly lastDate: DateKey | null;
  readonly entries: readonly FixtureCalendarEntry[];
};

export type FixtureRoundBoard = {
  readonly stageId: string;
  readonly stageKind: FixtureStageKind;
  readonly columns: readonly FixtureRoundColumn[];
};

/**
 * Rounds side by side, one board per stage. A round filter keeps only that round;
 * a Team filter keeps every round so the reader sees where the Team rests.
 */
export function fixtureRoundBoards(
  view: CompetitionFixtureView,
  entries: readonly FixtureCalendarEntry[],
  filters: FixtureCalendarFilters,
): FixtureRoundBoard[] {
  const visible = filterFixtureEntries(entries, filters);
  return view.stages
    .map((stage) => ({
      stageId: stage.id,
      stageKind: stage.kind,
      columns: stage.rounds
        .filter((round) => filters.roundId === null || round.id === filters.roundId)
        .map((round) => {
          const dates = entries
            .filter((entry) => entry.roundId === round.id)
            .map((entry) => entry.date)
            .sort();
          return {
            id: round.id,
            name: round.name,
            firstDate: dates[0] ?? null,
            lastDate: dates.at(-1) ?? null,
            entries: visible.filter((entry) => entry.roundId === round.id),
          };
        }),
    }))
    .filter((board) => board.columns.length > 0);
}

/** The round the next date belongs to, to mark it as current on the board. */
export function currentFixtureRoundId(
  entries: readonly FixtureCalendarEntry[],
  today: DateKey,
): string | null {
  return entries.find((entry) => entry.date >= today)?.roundId ?? null;
}
