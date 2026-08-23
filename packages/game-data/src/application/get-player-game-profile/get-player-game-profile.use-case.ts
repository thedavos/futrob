import { err, ok, type Result } from "@futrob/shared-kernel";
import type { ProviderError } from "../../domain/errors/provider.errors.ts";
import type { PlayerGameProfile } from "../../domain/policies/player-game-profile.ts";
import { buildPlayerGameProfile } from "../../domain/policies/player-game-profile.ts";
import { playerPitchRole } from "../../domain/policies/player-pitch-role.ts";
import type { PlayerGameOutcome } from "../../domain/policies/player-attribute-overview.ts";
import type { PlayerRecentMatchIdentity } from "../../domain/policies/player-appears-in-provider-match.ts";
import {
  PlayerRecentMatchWindowLoader,
  type PlayerRecentMatchClub,
  type PlayerRecentProviderMatch,
} from "../player-recent-match-window/player-recent-match-window.ts";
import type { GameDataProviderRegistryPort } from "../../domain/ports/game-data-provider-registry.port.ts";

export interface GetPlayerGameProfileInput {
  readonly accounts: readonly PlayerRecentMatchIdentity[];
  readonly clubs: readonly PlayerRecentMatchClub[];
}

export type PlayerGameProfileResult =
  | { readonly status: "needs_club" }
  | { readonly status: "needs_game_account" }
  | { readonly status: "ready"; readonly profile: PlayerGameProfile };

export class GetPlayerGameProfileUseCase {
  private readonly windowLoader: PlayerRecentMatchWindowLoader;

  constructor(registry: GameDataProviderRegistryPort) {
    this.windowLoader = new PlayerRecentMatchWindowLoader(registry);
  }

  async execute(
    input: GetPlayerGameProfileInput,
  ): Promise<Result<PlayerGameProfileResult, ProviderError>> {
    if (input.clubs.length === 0) return ok({ status: "needs_club" });
    if (input.accounts.length === 0) return ok({ status: "needs_game_account" });

    const window = await this.windowLoader.load(input);
    if (!window.isOk()) return err(window.error);
    return ok({
      status: "ready",
      profile: buildPlayerGameProfile(
        window.value.matches.flatMap((row) => samplesFromListedMatch(row)),
        input.accounts[0]?.identifier ?? null,
      ),
    });
  }
}

function samplesFromListedMatch(row: PlayerRecentProviderMatch) {
  if (row.kind !== "played") return [];
  const clubId = row.listedExternalClubId;
  const side =
    row.match.home.externalClubId === clubId
      ? "home"
      : row.match.away.externalClubId === clubId
        ? "away"
        : null;
  const clubName = side === "home" ? row.match.home.name : row.match.away.name;
  return [
    {
      occurredAt: row.match.occurredAt,
      clubId,
      clubName,
      position: row.appearance.position,
      role: playerPitchRole(row.appearance.position),
      outcome: outcomeFrom(row, side),
      appearance: row.appearance,
    },
  ];
}

function outcomeFrom(
  row: PlayerRecentProviderMatch,
  side: "home" | "away" | null,
): PlayerGameOutcome {
  if (side === null) return "unknown";
  const scored = side === "home" ? row.match.home.goals : row.match.away.goals;
  const conceded = side === "home" ? row.match.away.goals : row.match.home.goals;
  if (scored > conceded) return "win";
  if (scored < conceded) return "loss";
  return "draw";
}
