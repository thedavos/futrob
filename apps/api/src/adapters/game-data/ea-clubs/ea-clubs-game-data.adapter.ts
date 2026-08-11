import { createHash } from "node:crypto";
import { err, ok, type Result } from "@futrob/shared-kernel";
import {
  ExternalClubNotFound,
  ProviderSchemaError,
  type ExternalClub,
  type ProviderMatch,
  type GameDataProviderPort,
  type ProviderMatchIngestionPort,
  type IngestedProviderMatches,
  type GetExternalClubInput,
  type GetRecentMatchesInput,
  type ProviderError,
  type SearchExternalClubsInput,
} from "@futrob/game-data";
import { EaClubsHttpClient } from "./http/ea-clubs-http.ts";
import {
  eaClubInfoMapSchema,
  eaClubMatchesResponseSchema,
  eaSearchClubsResponseSchema,
  type EaClubMatch,
} from "./schemas/ea-clubs.schemas.ts";
import {
  mapClubInfoToExternalClub,
  mapClubMatchToProviderMatch,
  mapLeaderboardEntryToExternalClub,
} from "./mappers/ea-clubs.mappers.ts";

const MATCH_ENDPOINT = "/clubs/matches";
const MATCH_SCHEMA_VERSION = "ea-clubs.match.v1";

/**
 * EA Clubs adapter — the only place that may know proclubs.ea.com shapes.
 */
export class EaClubsGameDataAdapter implements GameDataProviderPort, ProviderMatchIngestionPort {
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
    if (!response.isOk()) {
      return err(response.error);
    }

    const parsed = eaSearchClubsResponseSchema.safeParse(response.value);
    if (!parsed.success) {
      return err(
        new ProviderSchemaError({
          code: "game_data.ea_clubs_schema_error",
          message: "Failed to parse EA search response",
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
    if (!response.isOk()) {
      return err(response.error);
    }

    const parsed = eaClubInfoMapSchema.safeParse(response.value);
    if (!parsed.success) {
      return err(
        new ProviderSchemaError({
          code: "game_data.ea_clubs_schema_error",
          message: "Failed to parse EA club info response",
          issues: parsed.error.issues,
        }),
      );
    }

    const info = parsed.data[input.externalClubId];
    if (!info) {
      return err(
        new ExternalClubNotFound({
          code: "game_data.external_club_not_found",
          message: "Club not found on EA Clubs",
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
    const ingested = await this.ingestRecentMatches(input);
    if (!ingested.isOk()) {
      return err(ingested.error);
    }
    return ok(ingested.value.matches);
  }

  async ingestRecentMatches(
    input: GetRecentMatchesInput,
  ): Promise<Result<IngestedProviderMatches, ProviderError>> {
    const response = await this.http.getJson(MATCH_ENDPOINT, {
      platform: input.platform,
      clubIds: input.externalClubId,
      matchType: input.matchType,
      maxResultCount: input.maxResultCount,
    });
    if (!response.isOk()) {
      return err(response.error);
    }

    const parsed = eaClubMatchesResponseSchema.safeParse(response.value);
    if (!parsed.success) {
      return err(
        new ProviderSchemaError({
          code: "game_data.ea_clubs_schema_error",
          message: "Failed to parse EA matches response",
          issues: parsed.error.issues,
        }),
      );
    }

    const observedAt = new Date();
    const observations = parsed.data.map((payload) => ({
      providerKey: this.key,
      resourceType: "match" as const,
      externalResourceId: payload.matchId,
      endpointKey: MATCH_ENDPOINT,
      payloadHash: hashPayload(payload),
      storageRef: "inline",
      payload,
      observedAt,
      httpStatus: 200,
      schemaVersion: MATCH_SCHEMA_VERSION,
    }));

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

    return ok({ observations, matches });
  }
}

function hashPayload(payload: EaClubMatch): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
