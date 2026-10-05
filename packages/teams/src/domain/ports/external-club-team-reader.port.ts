import type { GameDataProviderKey } from "@futrob/game-data";
import type { OrganizationId, TeamId } from "@futrob/shared-kernel";

export interface ExternalClubTeamReaderPort {
  listTeamIds(input: {
    readonly organizationId: OrganizationId;
    readonly providerKey: GameDataProviderKey;
    readonly externalClubId: string;
    readonly gameEdition: string;
    readonly platform: string;
  }): Promise<readonly TeamId[]>;
}
