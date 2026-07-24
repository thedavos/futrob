import { err, ok, type Result, domainError } from "@futrob/shared-kernel";
import type {
  ExternalClub,
  ProviderMatch,
  GameDataProviderPort,
  GetExternalClubInput,
  GetRecentMatchesInput,
  ProviderError,
  SearchExternalClubsInput,
} from "@futrob/game-data";
import { EaClubsHttpClient } from "@/modules/game-data/adapters/providers/ea-clubs/http/ea-clubs-http.ts";
import {
  eaClubInfoMapSchema,
  eaClubMatchesResponseSchema,
  eaSearchClubsResponseSchema,
} from "@/modules/game-data/adapters/providers/ea-clubs/schemas/ea-clubs.schemas.ts";
import {
  mapClubInfoToExternalClub,
  mapClubMatchToProviderMatch,
  mapLeaderboardEntryToExternalClub,
} from "@/modules/game-data/adapters/providers/ea-clubs/mappers/ea-clubs.mappers.ts";

/**
 * EA Clubs adapter — the only place that may know proclubs.ea.com shapes.
 */
export class EaClubsGameDataAdapter implements GameDataProviderPort {
  readonly key = "ea-clubs" as const;

  readonly capabilities = {
    searchClubs: true,
    getClubInfo: true,
    getRecentMatches: true,
    getPlayerStats: true,
    getTeamStats: true,
  } as const;

  private readonly http: EaClubsHttpClient;

  constructor(
    private readonly deps: {
      readonly fetcher: typeof fetch;
      readonly baseUrl: string;
      readonly timeoutMs: number;
    },
  ) {
    this.http = new EaClubsHttpClient({
      fetcher: deps.fetcher,
      baseUrl: deps.baseUrl,
      timeoutMs: deps.timeoutMs,
    });
  }

  async searchClubs(
    input: SearchExternalClubsInput,
  ): Promise<Result<ExternalClub[], ProviderError>> {
    const response = await this.http.getJson("/allTimeLeaderboard/search", {
      platform: input.platform,
      clubName: input.query,
    });
    if (!response.ok) {
      return response;
    }

    const parsed = eaSearchClubsResponseSchema.safeParse(response.value);
    if (!parsed.success) {
      return err(
        domainError("game_data.ea_clubs_schema_error", "Failed to parse EA search response", {
          issues: parsed.error.issues,
        }),
      );
    }

    const clubs = parsed.data
      .map((entry) =>
        mapLeaderboardEntryToExternalClub(entry, {
          platform: input.platform,
          gameEdition: input.gameEdition,
        }),
      )
      .filter((club): club is ExternalClub => club !== null);

    return ok(clubs);
  }

  async getClubInfo(input: GetExternalClubInput): Promise<Result<ExternalClub, ProviderError>> {
    const response = await this.http.getJson("/clubs/info", {
      platform: input.platform,
      clubIds: input.externalClubId,
    });
    if (!response.ok) {
      return response;
    }

    const parsed = eaClubInfoMapSchema.safeParse(response.value);
    if (!parsed.success) {
      return err(
        domainError("game_data.ea_clubs_schema_error", "Failed to parse EA club info response", {
          issues: parsed.error.issues,
        }),
      );
    }

    const info = parsed.data[input.externalClubId];
    if (!info) {
      return err(
        domainError("game_data.external_club_not_found", "Club not found on EA Clubs", {
          externalClubId: input.externalClubId,
        }),
      );
    }

    return ok(
      mapClubInfoToExternalClub(info, {
        platform: input.platform,
        gameEdition: input.gameEdition,
      }),
    );
  }

  async getRecentMatches(
    input: GetRecentMatchesInput,
  ): Promise<Result<ProviderMatch[], ProviderError>> {
    const response = await this.http.getJson("/clubs/matches", {
      platform: input.platform,
      clubIds: input.externalClubId,
      matchType: input.matchType,
      maxResultCount: input.maxResultCount,
    });
    if (!response.ok) {
      return response;
    }

    const parsed = eaClubMatchesResponseSchema.safeParse(response.value);
    if (!parsed.success) {
      return err(
        domainError("game_data.ea_clubs_schema_error", "Failed to parse EA matches response", {
          issues: parsed.error.issues,
        }),
      );
    }

    const matches = parsed.data
      .map((match) =>
        mapClubMatchToProviderMatch(match, {
          platform: input.platform,
          gameEdition: input.gameEdition,
          matchType: input.matchType,
          focalExternalClubId: input.externalClubId,
        }),
      )
      .filter((match): match is ProviderMatch => match !== null);

    return ok(matches);
  }
}
