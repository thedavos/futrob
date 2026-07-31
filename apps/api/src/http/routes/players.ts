import { Hono } from "hono";
import {
  addMyPlayerGameAccountRequestSchema,
  addMyPlayerGameAccountResponseSchema,
  getMyPlayerProfileResponseSchema,
} from "@futrob/api-contracts";
import type { AppDeps } from "@/app.ts";
import { domainErrorToHttp, validationErrorResponse } from "@/http/errors.ts";
import { playerGameAccountDto, playerProfileDto } from "@/http/mappers/player.ts";
import {
  createServiceAuthMiddleware,
  type ServiceAuthVariables,
} from "@/http/middleware/service-auth.ts";
import { jsonResponse } from "@/utils/http-response.ts";

export function registerPlayerRoutes(app: Hono, deps: AppDeps): void {
  const { teams } = deps.modules;
  const secured = new Hono<{ Variables: ServiceAuthVariables }>();
  secured.use("*", createServiceAuthMiddleware(deps.internalJobSecret));

  secured.get("/players/me", async (c) => {
    const details = await teams.getPlayerProfile.execute({ actorId: c.get("actorId") });
    return jsonResponse(
      getMyPlayerProfileResponseSchema.parse({
        profile: details.profile ? playerProfileDto(details.profile) : null,
        gameAccounts: details.gameAccounts.map(playerGameAccountDto),
      }),
    );
  });

  secured.post("/players/me/game-accounts", async (c) => {
    const json: unknown = await c.req.json().catch(() => null);
    const parsed = addMyPlayerGameAccountRequestSchema.safeParse(json);
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);

    const profile = await teams.ensurePlayerProfile.execute({ actorId: c.get("actorId") });
    const account = await teams.addPlayerGameAccount.execute({
      playerProfileId: profile.id,
      ...parsed.data,
    });
    if (!account.ok) return domainErrorToHttp(account.error);

    return jsonResponse(
      addMyPlayerGameAccountResponseSchema.parse({
        profile: playerProfileDto(profile),
        gameAccount: playerGameAccountDto(account.value),
      }),
      201,
    );
  });

  app.route("/", secured);
}
