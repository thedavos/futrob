import { Hono } from "hono";
import {
  addMyPlayerGameAccountRequestSchema,
  addMyPlayerGameAccountResponseSchema,
  getMyPlayerProfileResponseSchema,
  getMyTeamsResponseSchema,
  setActiveTeamRequestSchema,
  setActiveTeamResponseSchema,
} from "@futrob/api-contracts";
import type { AppDeps } from "@/app.ts";
import { domainErrorToHttp, validationErrorResponse } from "@/http/errors.ts";
import { playerGameAccountDto, playerProfileDto } from "@/http/mappers/player.ts";
import { playerTeamMembershipDto } from "@/http/mappers/team.ts";
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

  secured.get("/players/me/teams", async (c) => {
    const actorId = c.get("actorId");
    const details = await teams.getPlayerProfile.execute({ actorId });
    if (!details.profile) {
      return jsonResponse(
        getMyTeamsResponseSchema.parse({ teams: [], activeRosterMembershipId: null }),
      );
    }

    const memberships = await teams.listRostersForPlayer.execute({
      playerProfileId: details.profile.id,
    });
    const active = await teams.getActiveTeam.execute({ actorId });
    const teamsList = [];
    for (const membership of memberships) {
      const team = await teams.getTeam.execute({
        organizationId: membership.organizationId,
        teamId: membership.teamId,
      });
      if (!team) continue;
      teamsList.push(
        playerTeamMembershipDto({
          membership,
          team,
          active: active?.rosterMembershipId === membership.id,
        }),
      );
    }

    return jsonResponse(
      getMyTeamsResponseSchema.parse({
        teams: teamsList,
        activeRosterMembershipId: active?.rosterMembershipId ?? null,
      }),
    );
  });

  secured.put("/players/me/active-team", async (c) => {
    const parsed = setActiveTeamRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);

    const result = await teams.setActiveTeam.execute({
      actorId: c.get("actorId"),
      rosterMembershipId: parsed.data.rosterMembershipId,
    });
    if (!result.ok) return domainErrorToHttp(result.error);

    return jsonResponse(
      setActiveTeamResponseSchema.parse({
        actorId: result.value.actorId,
        rosterMembershipId: result.value.rosterMembershipId,
        updatedAt: result.value.updatedAt.toISOString(),
      }),
    );
  });

  app.route("/", secured);
}
