import { GAME_PLATFORM, type GamePlatform } from "@futrob/shared-kernel";

export const EA_SEARCH_PLATFORM = {
  CROSS_GEN: "common-gen5",
  PS5: "ps5",
  XBOX: "xbox",
  NINTENDO: "nx",
} as const;

export const EA_SEARCH_PLATFORM_VALUES = [
  EA_SEARCH_PLATFORM.CROSS_GEN,
  EA_SEARCH_PLATFORM.PS5,
  EA_SEARCH_PLATFORM.XBOX,
  EA_SEARCH_PLATFORM.NINTENDO,
] as const;

export type EaSearchPlatform = (typeof EA_SEARCH_PLATFORM_VALUES)[number];

export function asEaSearchPlatform(platform: string): EaSearchPlatform | null {
  return (EA_SEARCH_PLATFORM_VALUES as readonly string[]).includes(platform)
    ? (platform as EaSearchPlatform)
    : null;
}

export const EA_SEARCH_PLATFORM_OPTIONS = [
  { value: EA_SEARCH_PLATFORM.CROSS_GEN, label: "Cross-gen" },
  { value: EA_SEARCH_PLATFORM.PS5, label: "PlayStation 5" },
  { value: EA_SEARCH_PLATFORM.XBOX, label: "Xbox" },
  { value: EA_SEARCH_PLATFORM.NINTENDO, label: "Nintendo Switch" },
] as const satisfies ReadonlyArray<{
  readonly value: EaSearchPlatform;
  readonly label: string;
}>;

export function eaSearchPlatformFromGamePlatform(platform: GamePlatform | null): EaSearchPlatform {
  switch (platform) {
    case GAME_PLATFORM.PLAYSTATION:
      return EA_SEARCH_PLATFORM.PS5;
    case GAME_PLATFORM.XBOX:
      return EA_SEARCH_PLATFORM.XBOX;
    case GAME_PLATFORM.NINTENDO_SWITCH_1:
    case GAME_PLATFORM.NINTENDO_SWITCH_2:
      return EA_SEARCH_PLATFORM.NINTENDO;
    case GAME_PLATFORM.PC:
    case null:
      return EA_SEARCH_PLATFORM.CROSS_GEN;
  }
}

export function gamePlatformForEaSearchLogo(platform: EaSearchPlatform): GamePlatform {
  switch (platform) {
    case EA_SEARCH_PLATFORM.PS5:
      return GAME_PLATFORM.PLAYSTATION;
    case EA_SEARCH_PLATFORM.XBOX:
      return GAME_PLATFORM.XBOX;
    case EA_SEARCH_PLATFORM.NINTENDO:
      return GAME_PLATFORM.NINTENDO_SWITCH_2;
    case EA_SEARCH_PLATFORM.CROSS_GEN:
      return GAME_PLATFORM.PC;
  }
}
