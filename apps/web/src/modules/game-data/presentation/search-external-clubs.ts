import type { EaSearchPlatform, ExternalClubDto } from "@futrob/api-contracts";
import { gameDataBrowserClient } from "./game-data-browser-client.ts";

export type ExternalClubSearchInput = {
  readonly query: string;
  readonly platform: EaSearchPlatform;
  readonly gameEdition: string;
};

export type ExternalClubSearchFn = (
  input: ExternalClubSearchInput,
) => Promise<readonly ExternalClubDto[]>;

let searchOverride: ExternalClubSearchFn | null = null;

/** Storybook seam so club search does not hit the live game-data BFF. */
export function configureExternalClubSearch(search: ExternalClubSearchFn | null): void {
  searchOverride = search;
}

export async function searchExternalClubs(
  input: ExternalClubSearchInput,
): Promise<readonly ExternalClubDto[]> {
  if (searchOverride) return searchOverride(input);
  const result = await gameDataBrowserClient.searchClubs(input);
  if (!result.isOk()) throw result.error;
  return result.value.clubs;
}
