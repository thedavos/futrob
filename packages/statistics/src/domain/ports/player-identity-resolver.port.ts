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
  }): Promise<PlayerIdentityResolution>;
}
