export const MIN_COMPETITION_TEAMS = 2;
export const MAX_COMPETITION_TEAMS = 256;

/** Approved-team bounds. `max: null` means no limit. Built only through `parseTeamRange`. */
export interface TeamRange {
  readonly min: number;
  readonly max: number | null;
}

export const DEFAULT_TEAM_RANGE: TeamRange = { min: MIN_COMPETITION_TEAMS, max: null };

export function parseTeamRange(input: {
  readonly min: number;
  readonly max: number | null;
}): TeamRange | null {
  const inBounds = (value: number) =>
    Number.isInteger(value) && value >= MIN_COMPETITION_TEAMS && value <= MAX_COMPETITION_TEAMS;
  if (!inBounds(input.min)) return null;
  if (input.max !== null && (!inBounds(input.max) || input.max < input.min)) return null;
  return { min: input.min, max: input.max };
}

/** Whether one more approved team fits. Only approved entries consume capacity. */
export function hasCapacityFor(teams: TeamRange, approvedCount: number): boolean {
  return teams.max === null || approvedCount < teams.max;
}
