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
