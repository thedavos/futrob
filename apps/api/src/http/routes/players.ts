import type { Hono } from "hono";
import { asCompetitionId, asTeamId, TaggedError } from "@futrob/shared-kernel";
import {
  getMyGameProfileResponseSchema,
  getMyMatchesResponseSchema,
  getMyRecentMatchResponseSchema,
  getMyRecentMatchesResponseSchema,
  getMyNextEncounterResponseSchema,
  getMyPlayerProfileResponseSchema,
  getMyStatisticsResponseSchema,
  getMyTeamsResponseSchema,
  setActiveTeamResponseSchema,
  type GetMyGameProfileQuery,
  type GetMyStatisticsQuery,
} from "@futrob/api-contracts";
import type { AppDeps } from "@/app.ts";
import { failureToHttp, isHttpMappableFailure, validationErrorResponse } from "@/http/errors.ts";
import {
  playerExternalClubAssociationDto,
  playerGameAccountDto,
  playerProfileDto,
} from "@/http/mappers/player.ts";
import {
  toPlayerGameProfileDto,
  toPlayerRecentMatchDetailDto,
  toPlayerRecentMatchesDto,
} from "@/http/mappers/game-data.ts";
import { getMyNextEncounterResponse } from "@/http/mappers/next-encounter.ts";
import { playerTeamMembershipDto } from "@/http/mappers/team.ts";
import { createServiceOpenApiRouter } from "@/http/openapi/router.ts";
import {
  getMyGameProfileRoute,
  getMyMatchesRoute,
  getMyNextEncounterRoute,
  getMyPlayerProfileRoute,
  getMyRecentMatchRoute,
  getMyRecentMatchesRoute,
  getMyStatisticsRoute,
} from "@/http/openapi/routes/players.ts";
import { getMyTeamsRoute, setMyActiveTeamRoute } from "@/http/openapi/routes/teams.ts";
import { registerPersonalGameAccountRoutes } from "@/http/routes/players-personal-accounts.ts";
import { jsonResponse } from "@/utils/http-response.ts";

export function registerPlayerRoutes(app: Hono, deps: AppDeps): void {
  const { gameData, teams, statistics } = deps.modules;
  const secured = createServiceOpenApiRouter(deps.internalJobSecret);

  secured.openapi(getMyPlayerProfileRoute, async (c) => {
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

  registerPersonalGameAccountRoutes(secured, teams);

  secured.openapi(getMyStatisticsRoute, async (c) => {
    const parsed = c.req.valid("query");
    let stats;
    try {
      stats = await statistics.useCases.getMyPersonalStatistics.execute({
        actorId: c.get("actorId"),
        ...personalStatisticsFilters(parsed),
      });
    } catch (error) {
      if (TaggedError.is(error) && isHttpMappableFailure(error)) {
        return failureToHttp(error);
      }
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

  secured.openapi(getMyMatchesRoute, async (c) => {
    const parsed = c.req.valid("query");
    let page;
    try {
      const filters = personalStatisticsFilters(parsed);
      const base = {
        actorId: c.get("actorId"),
        limit: parsed.limit,
        ...filters,
      };
      page = await statistics.useCases.listMyMatchContributions.execute(
        parsed.cursor === undefined ? base : { ...base, cursor: parsed.cursor },
      );
    } catch (error) {
      if (TaggedError.is(error) && isHttpMappableFailure(error)) {
        return failureToHttp(error);
      }
      throw error;
    }
    return jsonResponse(
      getMyMatchesResponseSchema.parse({
        matches: page.items,
        nextCursor: page.nextCursor,
      }),
    );
  });

  secured.openapi(getMyRecentMatchesRoute, async (c) => {
    const parsed = c.req.valid("query");
    const details = await teams.getPlayerProfile.execute({ actorId: c.get("actorId") });
    const clubs = clubsForRecentMatches(details.externalClubs, parsed.externalClubId);
    if (parsed.externalClubId && details.externalClubs.length > 0 && clubs.length === 0) {
      return validationErrorResponse([
        {
          code: "custom",
          path: ["externalClubId"],
          message: "externalClubId must match an associated club",
        },
      ]);
    }
    const listed = await gameData.listPlayerRecentProviderMatches.execute({
      accounts: recentMatchAccounts(details),
      clubs: clubs.map(toRecentMatchClub),
    });
    if (!listed.isOk()) return failureToHttp(listed.error);
    return jsonResponse(
      getMyRecentMatchesResponseSchema.parse(toPlayerRecentMatchesDto(listed.value)),
    );
  });

  secured.openapi(getMyGameProfileRoute, async (c) => {
    const parsed = c.req.valid("query");
    const details = await teams.getPlayerProfile.execute({ actorId: c.get("actorId") });
    const clubs = clubsForRecentMatches(details.externalClubs, parsed.externalClubId);
    if (parsed.externalClubId && details.externalClubs.length > 0 && clubs.length === 0) {
      return validationErrorResponse([
        {
          code: "custom",
          path: ["externalClubId"],
          message: "externalClubId must match an associated club",
        },
      ]);
    }
    const profile = await gameData.getPlayerGameProfile.execute({
      accounts: recentMatchAccounts(details),
      clubs: clubs.map(toRecentMatchClub),
      period: gameProfilePeriod(parsed),
    });
    if (!profile.isOk()) return failureToHttp(profile.error);
    return jsonResponse(
      getMyGameProfileResponseSchema.parse(toPlayerGameProfileDto(profile.value)),
    );
  });

  secured.openapi(getMyRecentMatchRoute, async (c) => {
    const path = c.req.valid("param");
    const query = c.req.valid("query");
    const details = await teams.getPlayerProfile.execute({ actorId: c.get("actorId") });
    if (query.externalClubId === undefined && details.externalClubs.length > 0) {
      return validationErrorResponse([
        {
          code: "custom",
          path: ["externalClubId"],
          message: "externalClubId is required when associated clubs exist",
        },
      ]);
    }
    const selectedClub = details.externalClubs.find(
      (club) =>
        club.providerKey === path.providerKey && club.externalClubId === query.externalClubId,
    );
    if (query.externalClubId && details.externalClubs.length > 0 && !selectedClub) {
      return validationErrorResponse([
        {
          code: "custom",
          path: ["externalClubId"],
          message: "externalClubId must match a provider-associated club",
        },
      ]);
    }

    const found = await gameData.getPlayerRecentProviderMatch.execute({
      accounts: recentMatchAccounts(details),
      club: selectedClub ? toRecentMatchClub(selectedClub) : null,
      providerKey: path.providerKey,
      externalMatchId: path.externalMatchId,
    });
    if (!found.isOk()) return failureToHttp(found.error);
    return jsonResponse(
      getMyRecentMatchResponseSchema.parse(toPlayerRecentMatchDetailDto(found.value)),
    );
  });

  secured.openapi(getMyNextEncounterRoute, async (c) => {
    const encounter = await deps.modules.getMyNextEncounter.execute({
      actorId: c.get("actorId"),
    });
    return jsonResponse(
      getMyNextEncounterResponseSchema.parse(getMyNextEncounterResponse(encounter)),
    );
  });

  secured.openapi(getMyTeamsRoute, async (c) => {
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

  secured.openapi(setMyActiveTeamRoute, async (c) => {
    const parsed = c.req.valid("json");
    const result = await teams.setActiveTeam.execute({
      actorId: c.get("actorId"),
      rosterMembershipId: parsed.rosterMembershipId,
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
    competitionId:
      query.competitionId === undefined ? undefined : asCompetitionId(query.competitionId),
    teamId: query.teamId === undefined ? undefined : asTeamId(query.teamId),
    gameEdition: query.gameEdition,
    platform: query.platform,
    position: query.position,
  };
}

function clubsForRecentMatches<T extends { readonly externalClubId: string }>(
  clubs: readonly T[],
  externalClubId: string | undefined,
): readonly T[] {
  if (externalClubId === undefined) return clubs;
  return clubs.filter((club) => club.externalClubId === externalClubId);
}

function recentMatchAccounts(details: {
  readonly gameAccounts: readonly {
    readonly identifier: string;
    readonly normalizedIdentifier: string;
    readonly providerExternalPlayerId: string | null;
  }[];
}) {
  return details.gameAccounts.map((account) => ({
    identifier: account.identifier,
    normalizedIdentifier: account.normalizedIdentifier,
    providerExternalPlayerId: account.providerExternalPlayerId,
  }));
}

function gameProfilePeriod(
  query: GetMyGameProfileQuery,
): { readonly from: Date; readonly to: Date } | undefined {
  if (query.from === undefined || query.to === undefined) return undefined;
  return { from: new Date(query.from), to: new Date(query.to) };
}

function toRecentMatchClub(club: {
  readonly providerKey: "ea-clubs" | "manual" | "screenshot-ocr";
  readonly externalClubId: string;
  readonly platform: string;
  readonly gameEdition: string;
}) {
  return {
    providerKey: club.providerKey,
    externalClubId: club.externalClubId,
    platform: club.platform,
    gameEdition: club.gameEdition,
  };
}
