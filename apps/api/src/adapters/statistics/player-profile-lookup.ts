import type { PlayerProfileLookupPort } from "@futrob/statistics";
import type { PlayerProfileRepository } from "@futrob/teams";

export class TeamsPlayerProfileLookup implements PlayerProfileLookupPort {
  constructor(private readonly profiles: PlayerProfileRepository) {}

  async findByActor(
    actorId: Parameters<PlayerProfileLookupPort["findByActor"]>[0],
  ): ReturnType<PlayerProfileLookupPort["findByActor"]> {
    const profile = await this.profiles.findByActor(actorId);
    return profile ? { id: profile.id } : null;
  }
}
