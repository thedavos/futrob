import type { ActorId } from "@futrob/shared-kernel";
import type {
  ActorPreferences,
  ActorPreferencesUpdate,
} from "../value-objects/actor-preferences.ts";

export interface ActorPreferencesPort {
  findByActor(actorId: ActorId): Promise<ActorPreferences | null>;
  save(update: ActorPreferencesUpdate): Promise<void>;
}
