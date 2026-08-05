import {
  getClubQuerySchema,
  getClubResponseSchema,
  searchClubsQuerySchema,
  searchClubsResponseSchema,
  type GetClubQueryInput,
  type GetClubResponse,
  type SearchClubsQueryInput,
  type SearchClubsResponse,
} from "@futrob/api-contracts";
import { err, ok, TaggedError, type Result } from "@futrob/shared-kernel";

export class GameDataClientError extends TaggedError("GameDataClientError")<{
  code: string;
  message: string;
  status: number;
}> {}

function readErrorCode(raw: unknown, fallback: string): string {
  return raw && typeof raw === "object" && "code" in raw && typeof raw.code === "string"
    ? raw.code
    : fallback;
}

/** Browser client for same-origin game-data BFF (session cookies). */
export const gameDataBrowserClient = {
  async searchClubs(
    input: SearchClubsQueryInput,
  ): Promise<Result<SearchClubsResponse, GameDataClientError>> {
    const parsed = searchClubsQuerySchema.parse(input);
    const params = new URLSearchParams({
      query: parsed.query,
      providerKey: parsed.providerKey,
      platform: parsed.platform,
      gameEdition: parsed.gameEdition,
    });

    try {
      const response = await fetch(`/api/v1/game-data/clubs/search?${params.toString()}`, {
        method: "GET",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const raw: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        return err(
          new GameDataClientError({
            code: readErrorCode(raw, "game_data.client_error"),
            message: readErrorCode(raw, "game_data.client_error"),
            status: response.status,
          }),
        );
      }

      const body = searchClubsResponseSchema.safeParse(raw);
      if (!body.success) {
        return err(
          new GameDataClientError({
            code: "game_data.client_schema_error",
            message: "Invalid club search response",
            status: response.status,
          }),
        );
      }

      return ok(body.data);
    } catch (cause) {
      const causeText = cause instanceof Error ? cause.message : String(cause);
      return err(
        new GameDataClientError({
          code: "game_data.client_network_error",
          message: causeText,
          status: 0,
        }),
      );
    }
  },

  async getClub(
    externalClubId: string,
    input: GetClubQueryInput = {},
  ): Promise<Result<GetClubResponse, GameDataClientError>> {
    const parsed = getClubQuerySchema.parse(input);
    const params = new URLSearchParams({
      providerKey: parsed.providerKey,
      platform: parsed.platform,
      gameEdition: parsed.gameEdition,
    });

    try {
      const response = await fetch(
        `/api/v1/game-data/clubs/${encodeURIComponent(externalClubId)}?${params.toString()}`,
        {
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        },
      );
      const raw: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        return err(
          new GameDataClientError({
            code: readErrorCode(raw, "game_data.client_error"),
            message: readErrorCode(raw, "game_data.client_error"),
            status: response.status,
          }),
        );
      }

      const body = getClubResponseSchema.safeParse(raw);
      if (!body.success) {
        return err(
          new GameDataClientError({
            code: "game_data.client_schema_error",
            message: "Invalid club response",
            status: response.status,
          }),
        );
      }

      return ok(body.data);
    } catch (cause) {
      const causeText = cause instanceof Error ? cause.message : String(cause);
      return err(
        new GameDataClientError({
          code: "game_data.client_network_error",
          message: causeText,
          status: 0,
        }),
      );
    }
  },
};
