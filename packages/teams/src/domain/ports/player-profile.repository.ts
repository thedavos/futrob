import type { ActorId } from "@futrob/shared-kernel";
import type { PlayerProfile } from "../entities/player-profile.ts";

export interface PlayerProfileRepository {
  findByActor(actorId: ActorId): Promise<PlayerProfile | null>;
  saveIfAbsent(profile: PlayerProfile): Promise<PlayerProfile>;
}
