import { createFileRoute } from "@tanstack/react-router";
import {
  searchClubsQuerySchema,
  searchClubsResponseSchema,
  type GameDataProviderKeyQuery,
} from "@futrob/api-contracts";
import {
  apiErrorResponse,
  failureToHttp,
  jsonResponse,
  queryRecord,
} from "@/shared/infrastructure/http/api-response.ts";
import { createApiRequestContext } from "@/shared/infrastructure/http/create-api-request-context.ts";
import { toExternalClubDto } from "@/modules/game-data/server/game-data-api.mappers.ts";
import type { GameDataProviderKey } from "@/modules/game-data";

export const Route = createFileRoute("/api/v1/game-data/clubs/search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const parsed = searchClubsQuerySchema.safeParse(queryRecord(url));
        if (!parsed.success) {
          return apiErrorResponse(400, {
            code: "api.validation_error",
            messageKey: "errors.api.validation_error",
            details: { issues: parsed.error.issues },
          });
        }

        const { query, providerKey, platform, gameEdition } = parsed.data;
        const ctx = createApiRequestContext();
        const result = await ctx.modules.gameData.searchExternalClubs.execute(
          asProviderKey(providerKey),
          { query, platform, gameEdition },
        );

        if (!result.isOk()) {
          return failureToHttp(result.error);
        }

        const body = searchClubsResponseSchema.parse({
          clubs: result.value.map(toExternalClubDto),
        });
        return jsonResponse(body);
      },
    },
  },
});

function asProviderKey(key: GameDataProviderKeyQuery): GameDataProviderKey {
  return key;
}
