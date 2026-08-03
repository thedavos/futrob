import type { ActorId } from "@futrob/shared-kernel";
import type { ActiveTeamPreference } from "../entities/active-team-preference.ts";

export interface ActiveTeamPreferenceRepository {
  findByActor(actorId: ActorId): Promise<ActiveTeamPreference | null>;
  save(preference: ActiveTeamPreference): Promise<ActiveTeamPreference>;
}
