import { EA_SEARCH_PLATFORM_OPTIONS } from "@futrob/api-contracts";

/** Default EA Clubs search edition when the caller has no draft value. */
export const DEFAULT_EA_SEARCH_GAME_EDITION = "fc26";

/** Hard cap on clubs shown after an EA Clubs search. */
export const MAX_EXTERNAL_CLUB_SEARCH_RESULTS = 3;

export const eaSearchPlatforms = EA_SEARCH_PLATFORM_OPTIONS;

export function eaPlatformLabel(platform: string): string {
  return eaSearchPlatforms.find((option) => option.value === platform)?.label ?? platform;
}

/** Formats provider keys like `fc26` for display as `FC 26`. */
export function formatProviderGameEdition(edition: string): string {
  const trimmed = edition.trim();
  const match = trimmed.toLowerCase().match(/^fc[_\s-]?(\d{2})$/);
  if (match) return `FC ${match[1]}`;
  return trimmed;
}
