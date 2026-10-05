import type { ActorId, TeamId } from "@futrob/shared-kernel";

/** Who must agree before a proposal is accepted, as configured by Competitions. */
export type ScheduleChangeAuthority = "rival_team" | "organizer";

/** The capacity an actor answers in: for a Team, or as organizer/staff. */
export type ScheduleChangeResponder =
  | { readonly authority: "rival_team"; readonly teamId: TeamId }
  | { readonly authority: "organizer" };

export type ScheduleChangeDecisionKind = "consent" | "rejection";

/**
 * One answer to one proposal. Decisions are append-only: a counter-proposal does
 * not erase them, it simply leaves them attached to the proposal they answered.
 */
export interface ScheduleChangeDecision {
  readonly id: string;
  readonly proposalId: string;
  /** Request version the responder acted on. */
  readonly requestVersion: number;
  readonly kind: ScheduleChangeDecisionKind;
  readonly responder: ScheduleChangeResponder;
  readonly actorId: ActorId;
  readonly reason: string | null;
  readonly createdAt: Date;
}
