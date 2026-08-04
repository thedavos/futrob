import type { ActorId } from "@futrob/shared-kernel";
import type { PlayerGameAccount } from "../../domain/entities/player-game-account.ts";
import type { PlayerExternalClubAssociation } from "../../domain/entities/player-external-club-association.ts";
import type { PlayerProfile } from "../../domain/entities/player-profile.ts";
import type { PlayerExternalClubAssociationRepository } from "../../domain/ports/player-external-club-association.repository.ts";
import type { PlayerGameAccountRepository } from "../../domain/ports/player-game-account.repository.ts";
import type { PlayerProfileRepository } from "../../domain/ports/player-profile.repository.ts";

export interface PlayerProfileDetails {
  readonly profile: PlayerProfile | null;
  readonly gameAccounts: readonly PlayerGameAccount[];
  readonly externalClub: PlayerExternalClubAssociation | null;
}

export class GetPlayerProfileUseCase {
  constructor(
    private readonly profiles: PlayerProfileRepository,
    private readonly accounts: PlayerGameAccountRepository,
    private readonly associations: PlayerExternalClubAssociationRepository,
  ) {}

  async execute(input: { readonly actorId: ActorId }): Promise<PlayerProfileDetails> {
    const profile = await this.profiles.findByActor(input.actorId);
    if (!profile) {
      return { profile: null, gameAccounts: [], externalClub: null };
    }
    const [gameAccounts, externalClub] = await Promise.all([
      this.accounts.listByProfile(profile.id),
      this.associations.findByPlayerProfile(profile.id),
    ]);
    return { profile, gameAccounts, externalClub };
  }
}
