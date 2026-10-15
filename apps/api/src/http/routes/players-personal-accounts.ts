import type { OpenAPIHono } from "@hono/zod-openapi";
import {
  addMyPlayerGameAccountResponseSchema,
  associateMyPlayerExternalClubResponseSchema,
  updateMyPlayerGameAccountResponseSchema,
} from "@futrob/api-contracts";
import type { TeamsModule } from "@/di/teams.module.ts";
import { failureToHttp } from "@/http/errors.ts";
import {
  playerExternalClubAssociationDto,
  playerGameAccountDto,
  playerProfileDto,
} from "@/http/mappers/player.ts";
import type { ServiceAuthEnv } from "@/http/openapi/router.ts";
import {
  addMyPlayerGameAccountRoute,
  associateMyPlayerExternalClubRoute,
  updateMyPlayerGameAccountRoute,
} from "@/http/openapi/routes/players.ts";
import { jsonResponse } from "@/utils/http-response.ts";

export function registerPersonalGameAccountRoutes(
  secured: OpenAPIHono<ServiceAuthEnv>,
  teams: TeamsModule,
): void {
  secured.openapi(addMyPlayerGameAccountRoute, async (c) => {
    const parsed = c.req.valid("json");
    const profile = await teams.ensurePlayerProfile.execute({ actorId: c.get("actorId") });
    const account = await teams.addPlayerGameAccount.execute({
      playerProfileId: profile.id,
      ...parsed,
    });
    if (!account.isOk()) return failureToHttp(account.error);

    return jsonResponse(
      addMyPlayerGameAccountResponseSchema.parse({
        profile: playerProfileDto(profile),
        gameAccount: playerGameAccountDto(account.value),
      }),
      201,
    );
  });

  secured.openapi(updateMyPlayerGameAccountRoute, async (c) => {
    const params = c.req.valid("param");
    const parsed = c.req.valid("json");
    const profile = await teams.ensurePlayerProfile.execute({ actorId: c.get("actorId") });
    const account = await teams.updatePlayerGameAccount.execute({
      accountId: params.accountId,
      playerProfileId: profile.id,
      ...parsed,
    });
    if (!account.isOk()) return failureToHttp(account.error);

    return jsonResponse(
      updateMyPlayerGameAccountResponseSchema.parse({
        profile: playerProfileDto(profile),
        gameAccount: playerGameAccountDto(account.value),
      }),
    );
  });

  secured.openapi(associateMyPlayerExternalClubRoute, async (c) => {
    const parsed = c.req.valid("json");
    const profile = await teams.ensurePlayerProfile.execute({ actorId: c.get("actorId") });
    const associated = await teams.associatePlayerExternalClub.execute({
      playerProfileId: profile.id,
      club: {
        providerKey: parsed.providerKey,
        externalClubId: parsed.externalClubId,
        name: parsed.name,
        platform: parsed.platform,
        gameEdition: parsed.gameEdition,
        imageUrl: parsed.imageUrl,
      },
    });
    if (!associated.isOk()) return failureToHttp(associated.error);

    return jsonResponse(
      associateMyPlayerExternalClubResponseSchema.parse({
        profile: playerProfileDto(profile),
        externalClub: playerExternalClubAssociationDto(associated.value),
      }),
      201,
    );
  });
}
