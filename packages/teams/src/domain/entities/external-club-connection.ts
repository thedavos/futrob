import type { TeamId } from "@futrob/shared-kernel";
import type { GameDataProviderKey } from "@futrob/game-data";

export interface ExternalClubConnection {
  readonly teamId: TeamId;
  readonly providerKey: GameDataProviderKey;
  readonly externalClubId: string;
  readonly externalClubName: string;
  readonly gameEdition: string;
  readonly platform: string;
  readonly verifiedAt: Date | null;
  readonly verifiedBy: string | null;
}
