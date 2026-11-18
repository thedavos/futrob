import type { Hono } from "hono";
import {
  getClubMatchesResponseSchema,
  getClubResponseSchema,
  searchClubsResponseSchema,
  type SearchClubsQuery,
} from "@futrob/api-contracts";
import type { AppDeps } from "@/app.ts";
import { failureToHttp } from "@/http/errors.ts";
import { toExternalClubDto, toProviderMatchDto } from "@/http/mappers/game-data.ts";
import { createInternalOpenApiRouter, createServiceOpenApiRouter } from "@/http/openapi/router.ts";
import {
  getExternalClubRoute,
  getRecentProviderMatchesRoute,
  searchExternalClubsAnonymouslyRoute,
  searchExternalClubsRoute,
} from "@/http/openapi/routes/game-data.ts";
import { jsonResponse } from "@/utils/http-response.ts";

async function searchClubs(deps: AppDeps, request: SearchClubsQuery): Promise<Response> {
  const { query, providerKey, platform, gameEdition } = request;
  const result = await deps.modules.gameData.searchExternalClubs.execute(providerKey, {
    query,
    platform,
    gameEdition,
  });
  if (!result.isOk()) {
    return failureToHttp(result.error);
  }

  const body = searchClubsResponseSchema.parse({ clubs: result.value.map(toExternalClubDto) });
  return jsonResponse(body);
}

/**
 * Actor-free club search for the signed-out landing, called by the web BFF with the service secret.
 * Mount before any `createServiceOpenApiRouter`, whose `*` middleware would demand an actor.
 */
export function registerPublicGameDataClubRoutes(app: Hono, deps: AppDeps): void {
  const internal = createInternalOpenApiRouter(deps.internalJobSecret);
  internal.openapi(searchExternalClubsAnonymouslyRoute, async (c) =>
    searchClubs(deps, c.req.valid("query")),
  );
  app.route("/", internal);
}

export function registerGameDataClubRoutes(app: Hono, deps: AppDeps): void {
  const { gameData } = deps.modules;
  const secured = createServiceOpenApiRouter(deps.internalJobSecret);

  secured.openapi(searchExternalClubsRoute, async (c) => searchClubs(deps, c.req.valid("query")));

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
