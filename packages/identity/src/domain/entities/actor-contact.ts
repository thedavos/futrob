import type { ActorId } from "@futrob/shared-kernel";

export interface ActorContact {
  readonly actorId: ActorId;
  readonly displayName: string;
  readonly email: string;
}
