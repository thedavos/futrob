import { describe, expect, it } from "vite-plus/test";
import { asActorId } from "@futrob/shared-kernel";
import type {
  PlayerDirectoryEntry,
  PlayerDirectoryReader,
} from "../../domain/ports/player-directory.reader.ts";
import { SearchPlayersUseCase } from "./search-players.use-case.ts";

const players: readonly PlayerDirectoryEntry[] = [
  {
    actorId: asActorId("condor"),
    gamertag: "condor10",
    platform: "nintendo-switch-2",
    gameEdition: "FC 26",
    club: { name: "Cóndor FC", imageUrl: null, platform: "nintendo-switch-2" },
  },
  {
    actorId: asActorId("ricardo"),
    gamertag: "ricardo_9",
    platform: "playstation",
    gameEdition: "FC 26",
    club: null,
  },
];

/** Prefix match over normalized gamertags, as the real readers do. */
const directory: PlayerDirectoryReader = {
  async searchByGamertagPrefix(prefix, limit) {
    return players
      .filter((player) => player.gamertag.toLocaleLowerCase("en-US").startsWith(prefix))
      .slice(0, limit);
  },
};

describe("SearchPlayersUseCase", () => {
  it("finds players by the start of their gamertag, ignoring case and spaces", async () => {
    const result = await new SearchPlayersUseCase(directory).execute({ query: "  CON " });

    expect(result.isOk() && result.value.map((player) => player.gamertag)).toEqual(["condor10"]);
  });

  it("needs at least three characters", async () => {
    const result = await new SearchPlayersUseCase(directory).execute({ query: "co" });

    expect(!result.isOk() && result.error.code).toBe("teams.invalid_player_search");
  });

  it("returns at most ten players", async () => {
    const many: PlayerDirectoryReader = {
      async searchByGamertagPrefix(_prefix, limit) {
        return Array.from({ length: 25 }, (_, index) => ({
          ...players[1]!,
          gamertag: `ric${index}`,
        })).slice(0, limit);
      },
    };

    const result = await new SearchPlayersUseCase(many).execute({ query: "ric" });

    expect(result.isOk() && result.value.length).toBe(10);
  });
});
