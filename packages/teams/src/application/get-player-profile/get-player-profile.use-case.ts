import type { ActorId } from "@futrob/shared-kernel";
import type { PlayerGameAccount } from "../../domain/entities/player-game-account.ts";
import type { PlayerProfile } from "../../domain/entities/player-profile.ts";
import type { PlayerGameAccountRepository } from "../../domain/ports/player-game-account.repository.ts";
import type { PlayerProfileRepository } from "../../domain/ports/player-profile.repository.ts";

export interface PlayerProfileDetails {
  readonly profile: PlayerProfile | null;
  readonly gameAccounts: readonly PlayerGameAccount[];
}

export class GetPlayerProfileUseCase {
  constructor(
    private readonly profiles: PlayerProfileRepository,
    private readonly accounts: PlayerGameAccountRepository,
  ) {}

  async execute(input: { readonly actorId: ActorId }): Promise<PlayerProfileDetails> {
    const profile = await this.profiles.findByActor(input.actorId);
    return {
      profile,
      gameAccounts: profile ? await this.accounts.listByProfile(profile.id) : [],
    };
  }
}
