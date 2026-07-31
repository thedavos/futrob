import type { ActorId, ClockPort, IdGeneratorPort } from "@futrob/shared-kernel";
import type { PlayerProfile } from "../../domain/entities/player-profile.ts";
import type { PlayerProfileRepository } from "../../domain/ports/player-profile.repository.ts";

export class EnsurePlayerProfileUseCase {
  constructor(
    private readonly deps: {
      readonly profiles: PlayerProfileRepository;
      readonly clock: ClockPort;
      readonly ids: IdGeneratorPort;
    },
  ) {}

  async execute(input: { readonly actorId: ActorId }): Promise<PlayerProfile> {
    const existing = await this.deps.profiles.findByActor(input.actorId);
    if (existing) return existing;

    return this.deps.profiles.saveIfAbsent({
      id: this.deps.ids.generate(),
      actorId: input.actorId,
      createdAt: this.deps.clock.now(),
    });
  }
}
