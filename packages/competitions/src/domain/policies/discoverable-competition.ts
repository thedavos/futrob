import type { CompetitionStatus } from "../entities/competition.ts";

export const DISCOVERABLE_COMPETITION_STATUSES = [
  "registration",
  "published",
  "paused",
  "finished",
] as const;

export type DiscoverableCompetitionStatus = (typeof DISCOVERABLE_COMPETITION_STATUSES)[number];

export function isDiscoverableCompetitionStatus(
  status: CompetitionStatus,
): status is DiscoverableCompetitionStatus {
  return DISCOVERABLE_COMPETITION_STATUSES.some((value) => value === status);
}
