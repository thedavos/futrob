import { createFileRoute } from "@tanstack/react-router";
import {
  getClubMatchesQuerySchema,
  getClubMatchesResponseSchema,
  type GameDataProviderKeyQuery,
} from "@futrob/api-contracts";
import {
  apiErrorResponse,
  failureToHttp,
  jsonResponse,
  queryRecord,
} from "@/shared/infrastructure/http/api-response.ts";
import { createApiRequestContext } from "@/shared/infrastructure/http/create-api-request-context.ts";
import { toProviderMatchDto } from "@/modules/game-data/server/game-data-api.mappers.ts";
import type { GameDataProviderKey } from "@/modules/game-data";

export const Route = createFileRoute("/api/v1/game-data/clubs/$externalClubId/matches")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const parsed = getClubMatchesQuerySchema.safeParse(queryRecord(url));
        if (!parsed.success) {
          return apiErrorResponse(400, {
            code: "api.validation_error",
            messageKey: "errors.api.validation_error",
            details: { issues: parsed.error.issues },
          });
        }

        const { providerKey, platform, gameEdition, matchType, maxResultCount } = parsed.data;
        const ctx = createApiRequestContext();
        const result = await ctx.modules.gameData.getRecentProviderMatches.execute(
          asProviderKey(providerKey),
          {
            externalClubId: params.externalClubId,
            platform,
            gameEdition,
            matchType,
            maxResultCount,
          },
        );

        if (!result.isOk()) {
          return failureToHttp(result.error);
        }

        const body = getClubMatchesResponseSchema.parse({
          matches: result.value.map(toProviderMatchDto),
        });
        return jsonResponse(body);
      },
    },
  },
});

function asProviderKey(key: GameDataProviderKeyQuery): GameDataProviderKey {
  return key;
}
