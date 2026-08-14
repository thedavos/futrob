import { Hono } from "hono";
import type { PlayerMatchContribution } from "@futrob/statistics";
import { asCompetitionId, asTeamId } from "@futrob/shared-kernel";
import {
  addMyPlayerGameAccountRequestSchema,
  addMyPlayerGameAccountResponseSchema,
  associateMyPlayerExternalClubRequestSchema,
  associateMyPlayerExternalClubResponseSchema,
  getMyMatchesQuerySchema,
  getMyMatchesResponseSchema,
  getMyRecentMatchesResponseSchema,
  getMyPlayerProfileResponseSchema,
  getMyStatisticsQuerySchema,
  getMyStatisticsResponseSchema,
  getMyTeamsResponseSchema,
  setActiveTeamRequestSchema,
  setActiveTeamResponseSchema,
  type GetMyStatisticsQuery,
} from "@futrob/api-contracts";
import type { AppDeps } from "@/app.ts";
import { failureToHttp, isHttpMappableFailure, validationErrorResponse } from "@/http/errors.ts";
import {
  playerExternalClubAssociationDto,
  playerGameAccountDto,
  playerProfileDto,
} from "@/http/mappers/player.ts";
import { toPlayerRecentMatchesDto } from "@/http/mappers/game-data.ts";
import { playerTeamMembershipDto } from "@/http/mappers/team.ts";
import {
  createServiceAuthMiddleware,
  type ServiceAuthVariables,
} from "@/http/middleware/service-auth.ts";
import { jsonResponse } from "@/utils/http-response.ts";

export function registerPlayerRoutes(app: Hono, deps: AppDeps): void {
  const { gameData, teams, statistics } = deps.modules;
  const secured = new Hono<{ Variables: ServiceAuthVariables }>();
  secured.use("*", createServiceAuthMiddleware(deps.internalJobSecret));

  secured.get("/players/me", async (c) => {
    const details = await teams.getPlayerProfile.execute({ actorId: c.get("actorId") });
    const externalClubs = await Promise.all(
      details.externalClubs.map(async (club) => {
        if (club.imageUrl) return club;
        // Associations created before crest persistence (or when EA omitted crestAssetId)
        // stay imageUrl=null; hydrate once from game-data and persist without bumping associatedAt.
        const resolved = await gameData.getExternalClub.execute(club.providerKey, {
          externalClubId: club.externalClubId,
          platform: club.platform,
          gameEdition: club.gameEdition,
        });
        if (!resolved.isOk() || !resolved.value.imageUrl) return club;
        const associated = await teams.associatePlayerExternalClub.execute({
          playerProfileId: club.playerProfileId,
          club: resolved.value,
        });
        return associated.isOk() ? associated.value : club;
      }),
    );

    return jsonResponse(
      getMyPlayerProfileResponseSchema.parse({
        profile: details.profile ? playerProfileDto(details.profile) : null,
        gameAccounts: details.gameAccounts.map(playerGameAccountDto),
        externalClubs: externalClubs.map(playerExternalClubAssociationDto),
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
    if (!account.isOk()) return failureToHttp(account.error);

    return jsonResponse(
      addMyPlayerGameAccountResponseSchema.parse({
        profile: playerProfileDto(profile),
        gameAccount: playerGameAccountDto(account.value),
      }),
      201,
    );
  });

  secured.post("/players/me/external-club", async (c) => {
    const json: unknown = await c.req.json().catch(() => null);
    const parsed = associateMyPlayerExternalClubRequestSchema.safeParse(json);
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);

    const resolved = await gameData.getExternalClub.execute(parsed.data.providerKey, {
      externalClubId: parsed.data.externalClubId,
      platform: parsed.data.platform,
      gameEdition: parsed.data.gameEdition,
    });
    if (!resolved.isOk()) return failureToHttp(resolved.error);

    const profile = await teams.ensurePlayerProfile.execute({ actorId: c.get("actorId") });
    const associated = await teams.associatePlayerExternalClub.execute({
      playerProfileId: profile.id,
      club: resolved.value,
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

  secured.get("/players/me/statistics", async (c) => {
    const parsed = getMyStatisticsQuerySchema.safeParse({
      competitionId: c.req.query("competitionId") ?? undefined,
      teamId: c.req.query("teamId") ?? undefined,
      gameEdition: c.req.query("gameEdition") ?? undefined,
      platform: c.req.query("platform") ?? undefined,
      position: c.req.query("position") ?? undefined,
    });
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);

    let stats;
    try {
      stats = await statistics.useCases.getMyPersonalStatistics.execute({
        actorId: c.get("actorId"),
        ...personalStatisticsFilters(parsed.data),
      });
    } catch (error) {
      if (isHttpMappableFailure(error)) return failureToHttp(error);
      throw error;
    }
    return jsonResponse(
      getMyStatisticsResponseSchema.parse({
        statistics: stats
          ? {
              playerProfileId: stats.playerProfileId,
              matchesPlayed: stats.matchesPlayed,
              minutes: stats.minutes,
              totals: stats.totals,
              averages: stats.averages,
              per90: stats.per90,
              partial: stats.partial,
              sourceRevisionMax: stats.sourceRevisionMax,
              updatedAt: stats.updatedAt.toISOString(),
            }
          : null,
      }),
    );
  });

  secured.get("/players/me/matches", async (c) => {
    const parsed = getMyMatchesQuerySchema.safeParse({
      competitionId: c.req.query("competitionId") ?? undefined,
      teamId: c.req.query("teamId") ?? undefined,
      gameEdition: c.req.query("gameEdition") ?? undefined,
      platform: c.req.query("platform") ?? undefined,
      position: c.req.query("position") ?? undefined,
      cursor: c.req.query("cursor") ?? undefined,
      limit: c.req.query("limit") ?? undefined,
    });
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);

    let page;
    try {
      page = await statistics.useCases.listMyMatchContributions.execute({
        actorId: c.get("actorId"),
        ...personalStatisticsFilters(parsed.data),
        ...(parsed.data.cursor === undefined ? {} : { cursor: parsed.data.cursor }),
        limit: parsed.data.limit,
      });
    } catch (error) {
      if (isHttpMappableFailure(error)) return failureToHttp(error);
      throw error;
    }
    return jsonResponse(
      getMyMatchesResponseSchema.parse({
        matches: page.items.map((row: PlayerMatchContribution) => ({
          id: row.id,
          officialResultId: row.officialResultId,
          revision: row.revision,
          encounterId: row.encounterId,
          competitionId: row.competitionId,
          organizationId: row.organizationId,
          officialSlot: row.officialSlot,
          teamId: row.teamId,
          correlationStatus: row.correlationStatus,
          externalPlayerId: row.externalPlayerId,
          displayName: row.displayName,
          externalClubId: row.externalClubId,
          platform: row.platform,
          gameEdition: row.gameEdition,
          position: row.position,
          minutesPlayed: row.minutesPlayed,
          goals: row.goals,
          assists: row.assists,
          shots: row.shots,
          passAttempts: row.passAttempts,
          passesMade: row.passesMade,
          tackleAttempts: row.tackleAttempts,
          tacklesMade: row.tacklesMade,
          saves: row.saves,
          yellowCards: row.yellowCards,
          redCards: row.redCards,
          isMvp: row.isMvp,
          rating: row.rating,
        })),
        nextCursor: page.nextCursor,
      }),
    );
  });

  secured.get("/players/me/recent-matches", async (c) => {
    const details = await teams.getPlayerProfile.execute({ actorId: c.get("actorId") });
    const listed = await gameData.listPlayerRecentProviderMatches.execute({
      accounts: details.gameAccounts.map((account) => ({
        identifier: account.identifier,
        normalizedIdentifier: account.normalizedIdentifier,
        providerExternalPlayerId: account.providerExternalPlayerId,
      })),
      clubs: details.externalClubs.map((club) => ({
        providerKey: club.providerKey,
        externalClubId: club.externalClubId,
        platform: club.platform,
        gameEdition: club.gameEdition,
      })),
    });
    if (!listed.isOk()) return failureToHttp(listed.error);
    return jsonResponse(
      getMyRecentMatchesResponseSchema.parse(toPlayerRecentMatchesDto(listed.value)),
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
    if (!result.isOk()) return failureToHttp(result.error);

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

function personalStatisticsFilters(query: GetMyStatisticsQuery) {
  return {
    ...(query.competitionId === undefined
      ? {}
      : { competitionId: asCompetitionId(query.competitionId) }),
    ...(query.teamId === undefined ? {} : { teamId: asTeamId(query.teamId) }),
    ...(query.gameEdition === undefined ? {} : { gameEdition: query.gameEdition }),
    ...(query.platform === undefined ? {} : { platform: query.platform }),
    ...(query.position === undefined ? {} : { position: query.position }),
  };
}
