import type { ActorId } from "@futrob/shared-kernel";
import type { ActorContact } from "../entities/actor-contact.ts";

export interface ActorContactReader {
  listByActorIds(actorIds: readonly ActorId[]): Promise<readonly ActorContact[]>;
}
