import type { ActorId, TeamId } from "@futrob/shared-kernel";

export type ScheduleChangeResolution =
  | { readonly outcome: "schedule_set"; readonly reason: string; readonly proposedStartAt: Date }
  | { readonly outcome: "schedule_kept"; readonly reason: string }
  | {
      readonly outcome: "walkover_intended";
      readonly reason: string;
      readonly winningTeamId: TeamId;
    };

export interface ScheduleChangeAction {
  readonly id: string;
  readonly kind: "schedule_change_expired" | "schedule_change_resolved";
  readonly actorId: ActorId;
  readonly authority: "system" | "organizer";
  readonly proposalId: string;
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly responseDeadline: Date;
  readonly processedAt: Date;
  readonly resolution: ScheduleChangeResolution | null;
}
