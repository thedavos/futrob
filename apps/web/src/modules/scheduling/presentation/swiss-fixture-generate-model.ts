import {
  defaultSwissRounds,
  maxSwissRounds,
  type GenerateCompetitionFixtureRequest,
} from "@futrob/api-contracts";
import { resolutionInstant } from "./schedule-resolution-time.ts";

/**
 * The form only appears while the competition has no fixture, so this is always the first version.
 * A fixed version is what makes a double click idempotent: the same values replay the stored plan,
 * and different ones answer `scheduling.fixture_generation_conflict` instead of replacing it.
 */
const FIRST_GENERATION_VERSION = 1;

export const DEFAULT_ROUND_INTERVAL_DAYS = 7;

export type SwissGenerateValues = {
  /** `datetime-local` wall time, read in the competition time zone. */
  readonly startsAt: string;
  readonly intervalDays: string;
  readonly rounds: string;
};

export type SwissGenerateField = keyof SwissGenerateValues;

export type SwissGenerateContext = {
  readonly timeZone: string;
  /** Approved Teams, the same set the server seeds the fixture with. */
  readonly teamCount: number;
};

export type SwissGenerateValidation =
  | { readonly ok: true; readonly request: GenerateCompetitionFixtureRequest }
  | { readonly ok: false; readonly invalid: readonly SwissGenerateField[] };

export function swissGenerateDefaults(teamCount: number): SwissGenerateValues {
  return {
    startsAt: "",
    intervalDays: String(DEFAULT_ROUND_INTERVAL_DAYS),
    rounds: String(defaultSwissRounds(teamCount)),
  };
}

function wholeNumberIn(value: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value.trim());
  return parsed >= min && parsed <= max ? parsed : null;
}

export function validateSwissGenerate(
  values: SwissGenerateValues,
  context: SwissGenerateContext,
  now: Date,
): SwissGenerateValidation {
  const instant = resolutionInstant(values.startsAt, context.timeZone);
  const startsAt = instant && new Date(instant) > now ? instant : null;
  const roundIntervalDays = wholeNumberIn(values.intervalDays, 1, Number.MAX_SAFE_INTEGER);
  const rounds = wholeNumberIn(values.rounds, 1, maxSwissRounds(context.teamCount));
  if (startsAt === null || roundIntervalDays === null || rounds === null) {
    return {
      ok: false,
      invalid: [
        ...(startsAt === null ? (["startsAt"] as const) : []),
        ...(roundIntervalDays === null ? (["intervalDays"] as const) : []),
        ...(rounds === null ? (["rounds"] as const) : []),
      ],
    };
  }
  return {
    ok: true,
    request: {
      generationVersion: FIRST_GENERATION_VERSION,
      startsAt,
      roundIntervalDays,
      homeAndAway: false,
      swiss: { rounds },
    },
  };
}
