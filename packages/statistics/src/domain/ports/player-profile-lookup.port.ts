import type { ActorId } from "@futrob/shared-kernel";

export interface PlayerProfileLookupPort {
  findByActor(actorId: ActorId): Promise<{ readonly id: string } | null>;
}
