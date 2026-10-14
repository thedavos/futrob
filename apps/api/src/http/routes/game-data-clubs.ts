import type { Hono } from "hono";
import {
  getClubMatchesResponseSchema,
  getClubResponseSchema,
  searchClubsResponseSchema,
} from "@futrob/api-contracts";
import type { AppDeps } from "@/app.ts";
import { failureToHttp } from "@/http/errors.ts";
import { toExternalClubDto, toProviderMatchDto } from "@/http/mappers/game-data.ts";
import { createServiceOpenApiRouter } from "@/http/openapi/router.ts";
import {
  getExternalClubRoute,
  getRecentProviderMatchesRoute,
  searchExternalClubsRoute,
} from "@/http/openapi/routes/game-data.ts";
import { jsonResponse } from "@/utils/http-response.ts";

export function registerGameDataClubRoutes(app: Hono, deps: AppDeps): void {
  const { gameData } = deps.modules;
  const secured = createServiceOpenApiRouter(deps.internalJobSecret);

  secured.openapi(searchExternalClubsRoute, async (c) => {
    const { query, providerKey, platform, gameEdition } = c.req.valid("query");
    const result = await gameData.searchExternalClubs.execute(providerKey, {
      query,
      platform,
      gameEdition,
    });
    if (!result.isOk()) {
      return failureToHttp(result.error);
    }

    const body = searchClubsResponseSchema.parse({ clubs: result.value.map(toExternalClubDto) });
    return jsonResponse(body);
  });

  secured.openapi(getExternalClubRoute, async (c) => {
    const { providerKey, platform, gameEdition } = c.req.valid("query");
    const result = await gameData.getExternalClub.execute(providerKey, {
      externalClubId: c.req.valid("param").externalClubId,
      platform,
      gameEdition,
    });
    if (!result.isOk()) {
      return failureToHttp(result.error);
    }

    const body = getClubResponseSchema.parse(toExternalClubDto(result.value));
    return jsonResponse(body);
  });

  secured.openapi(getRecentProviderMatchesRoute, async (c) => {
    const { providerKey, platform, gameEdition, matchType, maxResultCount } = c.req.valid("query");
    const result = await gameData.getRecentProviderMatches.execute(providerKey, {
      externalClubId: c.req.valid("param").externalClubId,
      platform,
      gameEdition,
      matchType,
      maxResultCount,
    });
    if (!result.isOk()) {
      return failureToHttp(result.error);
    }

    const body = getClubMatchesResponseSchema.parse({
      matches: result.value.map(toProviderMatchDto),
    });
    return jsonResponse(body);
  });

  app.route("/", secured);
}
