import type { CompetitionStatus } from "@futrob/competitions";

/**
 * Statuses a spectator may read. `draft` and `archived` are private; `registration` is
 * discoverable to signed-in actors (ADR-0018) but has no published fixture, table or
 * results, so the anonymous portal does not exist for it yet.
 */
export const PUBLIC_COMPETITION_STATUSES = ["published", "paused", "finished"] as const;

export type PublicCompetitionStatus = (typeof PUBLIC_COMPETITION_STATUSES)[number];

export function isPubliclyVisibleStatus(
  status: CompetitionStatus,
): status is PublicCompetitionStatus {
  return PUBLIC_COMPETITION_STATUSES.some((value) => value === status);
}
