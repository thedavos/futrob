import type { Hono } from "hono";
import {
  addMyPlayerGameAccountRequestSchema,
  addMyPlayerGameAccountResponseSchema,
  associateMyPlayerExternalClubRequestSchema,
  associateMyPlayerExternalClubResponseSchema,
  updateMyPlayerGameAccountParamsSchema,
  updateMyPlayerGameAccountRequestSchema,
  updateMyPlayerGameAccountResponseSchema,
} from "@futrob/api-contracts";
import type { TeamsModule } from "@/di/teams.module.ts";
import { failureToHttp, validationErrorResponse } from "@/http/errors.ts";
import {
  playerExternalClubAssociationDto,
  playerGameAccountDto,
  playerProfileDto,
} from "@/http/mappers/player.ts";
import type { ServiceAuthVariables } from "@/http/middleware/service-auth.ts";
import { jsonResponse } from "@/utils/http-response.ts";

export function registerPersonalGameAccountRoutes(
  secured: Hono<{ Variables: ServiceAuthVariables }>,
  teams: TeamsModule,
): void {
  secured.post("/players/me/game-accounts", async (c) => {
    const json: unknown = await c.req.json().catch(() => null);
    const parsed = addMyPlayerGameAccountRequestSchema.safeParse(json);
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);

    const profile = await teams.ensurePlayerProfile.execute({ actorId: c.get("actorId") });
    const account = await teams.addPlayerGameAccount.execute({
      playerProfileId: profile.id,
      ...parsed.data,
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

  secured.patch("/players/me/game-accounts/:accountId", async (c) => {
    const params = updateMyPlayerGameAccountParamsSchema.safeParse({
      accountId: c.req.param("accountId"),
    });
    if (!params.success) return validationErrorResponse(params.error.issues);
    const json: unknown = await c.req.json().catch(() => null);
    const parsed = updateMyPlayerGameAccountRequestSchema.safeParse(json);
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);

    const profile = await teams.ensurePlayerProfile.execute({ actorId: c.get("actorId") });
    const account = await teams.updatePlayerGameAccount.execute({
      accountId: params.data.accountId,
      playerProfileId: profile.id,
      ...parsed.data,
    });
    if (!account.isOk()) return failureToHttp(account.error);

    return jsonResponse(
      updateMyPlayerGameAccountResponseSchema.parse({
        profile: playerProfileDto(profile),
        gameAccount: playerGameAccountDto(account.value),
      }),
    );
  });

  secured.post("/players/me/external-club", async (c) => {
    const json: unknown = await c.req.json().catch(() => null);
    const parsed = associateMyPlayerExternalClubRequestSchema.safeParse(json);
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);

    const profile = await teams.ensurePlayerProfile.execute({ actorId: c.get("actorId") });
    const associated = await teams.associatePlayerExternalClub.execute({
      playerProfileId: profile.id,
      club: {
        providerKey: parsed.data.providerKey,
        externalClubId: parsed.data.externalClubId,
        name: parsed.data.name,
        platform: parsed.data.platform,
        gameEdition: parsed.data.gameEdition,
        imageUrl: parsed.data.imageUrl,
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
