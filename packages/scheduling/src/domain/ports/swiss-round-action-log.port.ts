import type { ActorId, CompetitionId, OrganizationId, TeamId } from "@futrob/shared-kernel";

export type SwissRoundAction = {
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly fixturePlanId: string;
  readonly actorId: ActorId;
  readonly reason: string;
  readonly requestId: string;
  readonly occurredAt: Date;
} & (
  | { readonly kind: "withdraw"; readonly teamId: TeamId }
  | { readonly kind: "close_round"; readonly roundNumber: number }
);

/** Organizer trail of a Swiss plan; it outlives the encounters a command changes. */
export interface SwissRoundActionLogPort {
  findByRequestId(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    requestId: string,
  ): Promise<SwissRoundAction | null>;
  append(action: SwissRoundAction): Promise<void>;
}
