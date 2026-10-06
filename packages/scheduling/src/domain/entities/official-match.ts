import type {
  CompetitionId,
  EncounterId,
  OfficialMatchSlotId,
  OrganizationId,
} from "@futrob/shared-kernel";

export type OfficialMatchStatus =
  | "scheduled"
  | "awaiting_selection"
  | "selected"
  | "completed"
  | "voided";

export interface OfficialMatch {
  readonly id: OfficialMatchSlotId;
  readonly encounterId: EncounterId;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly slot: 1 | 2;
  readonly status: OfficialMatchStatus;
  /** Durable start of this slot; an `official_match` reschedule moves only this value. */
  readonly scheduledStartAt: Date;
  readonly createdAt: Date;
}
