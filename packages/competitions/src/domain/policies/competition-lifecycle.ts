import type { CompetitionStatus } from "../entities/competition.ts";

/** Statuses where staff may add, approve, reject or remove participants. */
export const PARTICIPANT_EDITABLE_STATUSES = ["draft", "registration"] as const;

/** Statuses a competition can be published from. */
export const PUBLISHABLE_STATUSES = PARTICIPANT_EDITABLE_STATUSES;

export function canEditParticipants(status: CompetitionStatus): boolean {
  return PARTICIPANT_EDITABLE_STATUSES.some((value) => value === status);
}

export function canPublish(status: CompetitionStatus): boolean {
  return PUBLISHABLE_STATUSES.some((value) => value === status);
}

/** Statuses that count against the plan's active competitions; finished ones stop counting. */
export const ACTIVE_COMPETITION_STATUSES = [
  "draft",
  "registration",
  "published",
  "paused",
] as const;

export function isActiveCompetitionStatus(status: CompetitionStatus): boolean {
  return ACTIVE_COMPETITION_STATUSES.some((value) => value === status);
}
