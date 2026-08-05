export const DEFAULT_MAX_ROSTER_SIZE = 11;

export function resolveMaxRosterSize(value: number | null): number {
  return value ?? DEFAULT_MAX_ROSTER_SIZE;
}
