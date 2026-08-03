import type { Hono } from "hono";
import {
  getClubMatchesQuerySchema,
  getClubMatchesResponseSchema,
  getClubQuerySchema,
  getClubResponseSchema,
  searchClubsQuerySchema,
  searchClubsResponseSchema,
} from "@futrob/api-contracts";
import type { AppDeps } from "@/app.ts";
import { failureToHttp, validationErrorResponse } from "@/http/errors.ts";
import { toExternalClubDto, toProviderMatchDto } from "@/http/mappers/game-data.ts";
import { jsonResponse } from "@/utils/http-response.ts";

export function registerGameDataClubRoutes(app: Hono, deps: AppDeps): void {
  const { gameData } = deps.modules;

  app.get("/game-data/clubs/search", async (c) => {
    const parsed = searchClubsQuerySchema.safeParse(c.req.query());
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues);
    }

    const { query, providerKey, platform, gameEdition } = parsed.data;
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

  app.get("/game-data/clubs/:externalClubId", async (c) => {
    const parsed = getClubQuerySchema.safeParse(c.req.query());
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues);
    }

    const { providerKey, platform, gameEdition } = parsed.data;
    const result = await gameData.getExternalClub.execute(providerKey, {
      externalClubId: c.req.param("externalClubId"),
      platform,
      gameEdition,
    });
    if (!result.isOk()) {
      return failureToHttp(result.error);
    }

    const body = getClubResponseSchema.parse(toExternalClubDto(result.value));
    return jsonResponse(body);
  });

  app.get("/game-data/clubs/:externalClubId/matches", async (c) => {
    const parsed = getClubMatchesQuerySchema.safeParse(c.req.query());
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues);
    }

    const { providerKey, platform, gameEdition, matchType, maxResultCount } = parsed.data;
    const result = await gameData.getRecentProviderMatches.execute(providerKey, {
      externalClubId: c.req.param("externalClubId"),
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
}
