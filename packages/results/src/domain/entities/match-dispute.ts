import type {
  ActorId,
  CompetitionId,
  EncounterId,
  OrganizationId,
  TeamId,
} from "@futrob/shared-kernel";

export type MatchDisputeStatus = "open" | "under_review" | "resolved";
export type MatchDisputeResolution = "approved_proposal" | "returned_to_selection";

/** At most one non-resolved dispute exists per selection. */
export interface MatchDispute {
  readonly id: string;
  readonly selectionId: string;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly encounterId: EncounterId;
  readonly status: MatchDisputeStatus;
  readonly openedByActorId: ActorId;
  readonly openedByTeamId: TeamId;
  readonly openedReason: string;
  readonly openedAt: Date;
  readonly reviewStartedByActorId: ActorId | null;
  readonly reviewStartedAt: Date | null;
  readonly resolvedByActorId: ActorId | null;
  readonly resolvedAt: Date | null;
  readonly resolution: MatchDisputeResolution | null;
  readonly resolutionProposalId: string | null;
  readonly resolutionReason: string | null;
}
