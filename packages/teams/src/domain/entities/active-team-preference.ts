import type { ActorId } from "@futrob/shared-kernel";

export interface ActiveTeamPreference {
  readonly actorId: ActorId;
  readonly rosterMembershipId: string;
  readonly updatedAt: Date;
}
