import type { GamePlatformDto } from "@futrob/api-contracts";

export function platformLabel(platform: GamePlatformDto): string {
  return {
    playstation: "PlayStation",
    xbox: "Xbox",
    pc: "PC",
    "nintendo-switch-1": "Nintendo Switch 1",
    "nintendo-switch-2": "Nintendo Switch 2",
  }[platform];
}
