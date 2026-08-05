import { err, ok, type ClockPort, type Result } from "@futrob/shared-kernel";
import type { GameDataProviderKey } from "@futrob/game-data";
import type { PlayerExternalClubAssociation } from "../../domain/entities/player-external-club-association.ts";
import {
  PlayerProfileNotFound,
  type AssociatePlayerExternalClubError,
} from "../../domain/errors/team.errors.ts";
import type { PlayerExternalClubAssociationRepository } from "../../domain/ports/player-external-club-association.repository.ts";
import type { PlayerProfileRepository } from "../../domain/ports/player-profile.repository.ts";

export interface AssociatePlayerExternalClubInput {
  readonly playerProfileId: string;
  readonly club: {
    readonly providerKey: GameDataProviderKey;
    readonly externalClubId: string;
    readonly name: string;
    readonly platform: string;
    readonly gameEdition: string;
    readonly imageUrl: string | null;
  };
}

export class AssociatePlayerExternalClubUseCase {
  constructor(
    private readonly deps: {
      readonly profiles: PlayerProfileRepository;
      readonly associations: PlayerExternalClubAssociationRepository;
      readonly clock: ClockPort;
    },
  ) {}

  async execute(
    input: AssociatePlayerExternalClubInput,
  ): Promise<Result<PlayerExternalClubAssociation, AssociatePlayerExternalClubError>> {
    const profile = await this.deps.profiles.findById(input.playerProfileId);
    if (!profile) {
      return err(
        new PlayerProfileNotFound({
          code: "teams.player_profile_not_found",
          message: "Player profile not found",
        }),
      );
    }

    const association: PlayerExternalClubAssociation = {
      playerProfileId: profile.id,
      providerKey: input.club.providerKey,
      externalClubId: input.club.externalClubId,
      externalClubName: input.club.name,
      platform: input.club.platform,
      gameEdition: input.club.gameEdition,
      imageUrl: input.club.imageUrl,
      associatedAt: this.deps.clock.now(),
    };
    return ok(await this.deps.associations.upsertForPlayerProfile(association));
  }
}
