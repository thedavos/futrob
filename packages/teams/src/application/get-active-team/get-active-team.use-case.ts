import type { ActorId } from "@futrob/shared-kernel";
import type { ActiveTeamPreference } from "../../domain/entities/active-team-preference.ts";
import type { ActiveTeamPreferenceRepository } from "../../domain/ports/active-team-preference.repository.ts";

export class GetActiveTeamUseCase {
  constructor(private readonly preferences: ActiveTeamPreferenceRepository) {}

  async execute(input: { readonly actorId: ActorId }): Promise<ActiveTeamPreference | null> {
    return this.preferences.findByActor(input.actorId);
  }
}
