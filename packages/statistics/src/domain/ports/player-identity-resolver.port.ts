import type { CompetitionId } from "@futrob/shared-kernel";

export type PlayerIdentityResolution =
  | {
      readonly status: "matched";
      readonly playerProfileId: string;
      readonly gameAccountId: string;
    }
  | { readonly status: "unmatched" }
  | { readonly status: "ambiguous" };

export interface PlayerIdentityResolverPort {
  resolve(input: {
    readonly externalPlayerId: string;
    readonly platform: string;
    readonly gameEdition: string;
    readonly competitionId?: CompetitionId;
    readonly teamContext?: {
      readonly externalClubId: string;
      readonly officialSlot: 1 | 2;
    };
  }): Promise<PlayerIdentityResolution>;
}
