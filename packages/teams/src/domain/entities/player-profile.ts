import type { ActorId } from "@futrob/shared-kernel";

export interface PlayerProfile {
  readonly id: string;
  readonly actorId: ActorId;
  readonly createdAt: Date;
}
