import { GAME_PLATFORM_VALUES } from "@futrob/shared-kernel";
import { z } from "zod";

export const gamePlatformSchema = z.enum(GAME_PLATFORM_VALUES);
export type GamePlatformDto = z.infer<typeof gamePlatformSchema>;
