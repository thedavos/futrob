export const GAME_PLATFORM = {
  PLAYSTATION: "playstation",
  XBOX: "xbox",
  PC: "pc",
  NINTENDO_SWITCH_1: "nintendo-switch-1",
  NINTENDO_SWITCH_2: "nintendo-switch-2",
} as const;

export const GAME_PLATFORM_VALUES = [
  GAME_PLATFORM.PLAYSTATION,
  GAME_PLATFORM.XBOX,
  GAME_PLATFORM.PC,
  GAME_PLATFORM.NINTENDO_SWITCH_1,
  GAME_PLATFORM.NINTENDO_SWITCH_2,
] as const;

export type GamePlatform = (typeof GAME_PLATFORM_VALUES)[number];
