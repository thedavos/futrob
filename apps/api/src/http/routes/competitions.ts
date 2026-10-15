import type { Hono } from "hono";
import {
  applyToCompetitionResponseSchema,
  getMyCompetitionApplicationResponseSchema,
  createCompetitionDraftResponseSchema,
  exploreCompetitionsResponseSchema,
  getCompetitionDraftResponseSchema,
  getExploreCompetitionResponseSchema,
  getCompetitionRankingsResponseSchema,
  getCompetitionStandingsResponseSchema,
  getTeamPerformanceRankingResponseSchema,
  getCompetitionTeamStatisticsResponseSchema,
  listAccessibleCompetitionsResponseSchema,
  listOrganizationCompetitionsResponseSchema,
  listOrganizationTeamsResponseSchema,
  updateCompetitionCoverResponseSchema,
  updateCompetitionDraftResponseSchema,
} from "@futrob/api-contracts";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { TEAM_PERMISSION } from "@futrob/teams";
import { TaggedError, asCompetitionId, asOrganizationId } from "@futrob/shared-kernel";
import type { AppDeps } from "@/app.ts";
import { apiErrorResponse, failureToHttp, isHttpMappableFailure } from "@/http/errors.ts";
import { createServiceOpenApiRouter } from "@/http/openapi/router.ts";
import {
  applyToCompetitionRoute,
  createCompetitionDraftRoute,
  exploreCompetitionsRoute,
  getCompetitionDraftRoute,
  getExploreCompetitionRoute,
  getMyCompetitionApplicationRoute,
  listAccessibleCompetitionsRoute,
  listOrganizationCompetitionsRoute,
  updateCompetitionCoverRoute,
  updateCompetitionDraftRoute,
} from "@/http/openapi/routes/competitions.ts";
import {
  getCompetitionRankingsRoute,
  getCompetitionStandingsRoute,
  getCompetitionTeamStatisticsRoute,
  getTeamPerformanceRankingRoute,
} from "@/http/openapi/routes/statistics.ts";
import { listOrganizationTeamsRoute } from "@/http/openapi/routes/teams.ts";
import {
  competitionDraftDto,
  competitionDto,
  exploreCompetitionDto,
} from "@/http/mappers/competition.ts";
import { teamDto } from "@/http/mappers/team.ts";
import { competitionApplicationDto } from "@/http/mappers/competition-entry.ts";
import { jsonResponse } from "@/utils/http-response.ts";
import { requireApiPermission } from "@/http/require-api-permission.ts";

export function registerCompetitionRoutes(app: Hono, deps: AppDeps): void {
  const secured = createServiceOpenApiRouter(deps.internalJobSecret);

  secured.openapi(exploreCompetitionsRoute, async (c) => {
    const page = await deps.modules.competitions.explore.list(c.req.valid("query"));
    return jsonResponse(
      exploreCompetitionsResponseSchema.parse({
        items: page.items.map(exploreCompetitionDto),
        total: page.total,
        nextCursor: page.nextCursor,
      }),
    );
  });

  secured.openapi(getExploreCompetitionRoute, async (c) => {
    const result = await deps.modules.competitions.explore.get(
      asCompetitionId(c.req.valid("param").competitionId),
    );
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      getExploreCompetitionResponseSchema.parse(exploreCompetitionDto(result.value)),
    );
  });

  secured.openapi(getMyCompetitionApplicationRoute, async (c) => {
    const application = await deps.modules.competitionApplications.mine({
      actorId: c.get("actorId"),
      competitionId: asCompetitionId(c.req.valid("param").competitionId),
    });
    return jsonResponse(
      getMyCompetitionApplicationResponseSchema.parse({
        application: application ? competitionApplicationDto(application) : null,
      }),
    );
  });

  secured.openapi(applyToCompetitionRoute, async (c) => {
    const parsed = c.req.valid("json");
    const result = await deps.modules.competitionApplications.apply({
      actorId: c.get("actorId"),
      competitionId: asCompetitionId(c.req.valid("param").competitionId),
      teamName: parsed.teamName,
      creationKey: parsed.creationKey,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      applyToCompetitionResponseSchema.parse(competitionApplicationDto(result.value)),
      201,
    );
  });

  secured.openapi(listAccessibleCompetitionsRoute, async (c) => {
    const competitions = await deps.modules.authorization.listAccessibleCompetitions.execute({
      actorId: c.get("actorId"),
    });
    return jsonResponse(
      listAccessibleCompetitionsResponseSchema.parse({
        competitions: competitions.map((item) => ({
          competition: competitionDto(item.competition),
          role: item.role,
        })),
      }),
    );
  });

  secured.openapi(listOrganizationCompetitionsRoute, async (c) => {
    const organizationId = asOrganizationId(c.req.valid("param").organizationId);
    const forbidden = await requireApiPermission(deps, {
      actorId: c.get("actorId"),
      permission: COMPETITION_PERMISSION.read,
      scope: { organizationId },
    });
    if (forbidden) return forbidden;

    const competitions = await deps.modules.competitions.listByOrganization.execute({
      organizationId,
    });
    return jsonResponse(
      listOrganizationCompetitionsResponseSchema.parse({
        competitions: competitions.map(competitionDto),
      }),
    );
  });

  secured.openapi(createCompetitionDraftRoute, async (c) => {
    const organizationId = asOrganizationId(c.req.valid("param").organizationId);
    const result = await deps.modules.competitions.createDraft.execute({
      organizationId,
      actorId: c.get("actorId"),
      ...c.req.valid("json"),
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      createCompetitionDraftResponseSchema.parse(competitionDraftDto(result.value)),
      201,
    );
  });

  secured.openapi(updateCompetitionCoverRoute, async (c) => {
    const params = c.req.valid("param");
    const result = await deps.modules.competitions.updateCover.execute({
      actorId: c.get("actorId"),
      organizationId: asOrganizationId(params.organizationId),
      competitionId: asCompetitionId(params.competitionId),
      cover: c.req.valid("json").cover,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      updateCompetitionCoverResponseSchema.parse(competitionDraftDto(result.value)),
    );
  });

  secured.openapi(listOrganizationTeamsRoute, async (c) => {
    const organizationId = asOrganizationId(c.req.valid("param").organizationId);
    const forbidden = await requireApiPermission(deps, {
      actorId: c.get("actorId"),
      permission: TEAM_PERMISSION.read,
      scope: { organizationId },
    });
    if (forbidden) return forbidden;
    const teams = await deps.modules.teams.listByOrganization.execute({ organizationId });
    return jsonResponse(listOrganizationTeamsResponseSchema.parse({ teams: teams.map(teamDto) }));
  });

  secured.openapi(getCompetitionDraftRoute, async (c) => {
    const params = c.req.valid("param");
    const organizationId = asOrganizationId(params.organizationId);
    const competitionId = asCompetitionId(params.competitionId);
    const forbidden = await requireApiPermission(deps, {
      actorId: c.get("actorId"),
      permission: COMPETITION_PERMISSION.read,
      scope: { organizationId, competitionId },
    });
    if (forbidden) return forbidden;

    const draft = await deps.modules.competitions.getDraft.execute({
      organizationId,
      competitionId,
    });
    if (!draft) {
      return apiErrorResponse(404, {
        code: "competitions.not_found",
        messageKey: "errors.competitions.not_found",
      });
    }
    return jsonResponse(getCompetitionDraftResponseSchema.parse(competitionDraftDto(draft)));
  });

  secured.openapi(getTeamPerformanceRankingRoute, async (c) => {
    const params = c.req.valid("param");
    try {
      const ranking = await deps.modules.statistics.useCases.getTeamPerformanceRanking.execute({
        actorId: c.get("actorId"),
        organizationId: asOrganizationId(params.organizationId),
        competitionId: asCompetitionId(params.competitionId),
      });
      return jsonResponse(
        getTeamPerformanceRankingResponseSchema.parse({
          ranking: ranking ? { ...ranking, updatedAt: ranking.updatedAt.toISOString() } : null,
        }),
      );
    } catch (error) {
      if (TaggedError.is(error) && isHttpMappableFailure(error)) return failureToHttp(error);
      throw error;
    }
  });

  secured.openapi(getCompetitionStandingsRoute, async (c) => {
    const params = c.req.valid("param");
    const organizationId = asOrganizationId(params.organizationId);
    const competitionId = asCompetitionId(params.competitionId);
    let standings;
    try {
      standings = await deps.modules.statistics.useCases.getCompetitionStandings.execute({
        actorId: c.get("actorId"),
        organizationId,
        competitionId,
      });
    } catch (error) {
      if (TaggedError.is(error) && isHttpMappableFailure(error)) {
        return failureToHttp(error);
      }
      throw error;
    }
    return jsonResponse(
      getCompetitionStandingsResponseSchema.parse({
        standings: standings
          ? {
              competitionId: standings.competitionId,
              organizationId: standings.organizationId,
              formulaVersion: standings.formulaVersion,
              rows: standings.rows,
              sourceRevisionMax: standings.sourceRevisionMax,
              updatedAt: standings.updatedAt.toISOString(),
            }
          : null,
      }),
    );
  });

  secured.openapi(getCompetitionTeamStatisticsRoute, async (c) => {
    const params = c.req.valid("param");
    const organizationId = asOrganizationId(params.organizationId);
    const competitionId = asCompetitionId(params.competitionId);
    let teams;
    try {
      teams = await deps.modules.statistics.useCases.getCompetitionTeamStatistics.execute({
        actorId: c.get("actorId"),
        organizationId,
        competitionId,
      });
    } catch (error) {
      if (TaggedError.is(error) && isHttpMappableFailure(error)) {
        return failureToHttp(error);
      }
      throw error;
    }
    return jsonResponse(
      getCompetitionTeamStatisticsResponseSchema.parse({
        teams: teams.map((stats) => ({
          teamId: stats.teamId,
          competitionId: stats.competitionId,
          organizationId: stats.organizationId,
          matchesPlayed: stats.matchesPlayed,
          minutes: stats.minutes,
          totals: stats.totals,
          averages: stats.averages,
          per90: stats.per90,
          partial: stats.partial,
          sourceRevisionMax: stats.sourceRevisionMax,
          updatedAt: stats.updatedAt.toISOString(),
        })),
      }),
    );
  });

  secured.openapi(getCompetitionRankingsRoute, async (c) => {
    const params = c.req.valid("param");
    const organizationId = asOrganizationId(params.organizationId);
    const competitionId = asCompetitionId(params.competitionId);
    const query = c.req.valid("query");
    let rankings;
    try {
      rankings = await deps.modules.statistics.useCases.getCompetitionRankings.execute(
        query.kind === undefined
          ? { actorId: c.get("actorId"), organizationId, competitionId }
          : {
              actorId: c.get("actorId"),
              organizationId,
              competitionId,
              kind: query.kind,
            },
      );
    } catch (error) {
      if (TaggedError.is(error) && isHttpMappableFailure(error)) {
        return failureToHttp(error);
      }
      throw error;
    }
    return jsonResponse(
      getCompetitionRankingsResponseSchema.parse({
        rankings: rankings.map((snapshot) => ({
          competitionId: snapshot.competitionId,
          organizationId: snapshot.organizationId,
          kind: snapshot.kind,
          formulaVersion: snapshot.formulaVersion,
          eligibility: snapshot.eligibility,
          rows: snapshot.rows,
          sourceRevisionMax: snapshot.sourceRevisionMax,
          updatedAt: snapshot.updatedAt.toISOString(),
        })),
      }),
    );
  });

  secured.openapi(updateCompetitionDraftRoute, async (c) => {
    const params = c.req.valid("param");
    const organizationId = asOrganizationId(params.organizationId);
    const competitionId = asCompetitionId(params.competitionId);
    const result = await deps.modules.competitions.updateDraft.execute({
      actorId: c.get("actorId"),
      organizationId,
      competitionId,
      ...c.req.valid("json"),
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      updateCompetitionDraftResponseSchema.parse(competitionDraftDto(result.value)),
    );
  });

  app.route("/", secured);
}
