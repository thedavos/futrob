import { Hono } from "hono";
import {
  applyToCompetitionRequestSchema,
  updateCompetitionCoverRequestSchema,
  updateCompetitionCoverResponseSchema,
  applyToCompetitionResponseSchema,
  getMyCompetitionApplicationResponseSchema,
  createCompetitionDraftRequestSchema,
  createCompetitionDraftResponseSchema,
  exploreCompetitionsQuerySchema,
  exploreCompetitionsResponseSchema,
  getCompetitionDraftResponseSchema,
  getExploreCompetitionResponseSchema,
  getCompetitionRankingsQuerySchema,
  getCompetitionRankingsResponseSchema,
  getCompetitionStandingsResponseSchema,
  getCompetitionTeamStatisticsResponseSchema,
  listAccessibleCompetitionsResponseSchema,
  listOrganizationCompetitionsResponseSchema,
  listOrganizationTeamsResponseSchema,
  updateCompetitionDraftRequestSchema,
  updateCompetitionDraftResponseSchema,
} from "@futrob/api-contracts";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { TEAM_PERMISSION } from "@futrob/teams";
import { TaggedError, asCompetitionId, asOrganizationId } from "@futrob/shared-kernel";
import type { AppDeps } from "@/app.ts";
import {
  apiErrorResponse,
  failureToHttp,
  isHttpMappableFailure,
  validationErrorResponse,
} from "@/http/errors.ts";
import {
  createServiceAuthMiddleware,
  type ServiceAuthVariables,
} from "@/http/middleware/service-auth.ts";
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
  const secured = new Hono<{ Variables: ServiceAuthVariables }>();
  secured.use("*", createServiceAuthMiddleware(deps.internalJobSecret));

  secured.get("/competitions/explore", async (c) => {
    const parsed = exploreCompetitionsQuerySchema.safeParse(c.req.query());
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);
    const page = await deps.modules.competitions.explore.list(parsed.data);
    return jsonResponse(
      exploreCompetitionsResponseSchema.parse({
        items: page.items.map(exploreCompetitionDto),
        total: page.total,
        nextCursor: page.nextCursor,
      }),
    );
  });

  secured.get("/competitions/explore/:competitionId", async (c) => {
    const result = await deps.modules.competitions.explore.get(
      asCompetitionId(c.req.param("competitionId")),
    );
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      getExploreCompetitionResponseSchema.parse(exploreCompetitionDto(result.value)),
    );
  });

  secured.get("/competitions/explore/:competitionId/application", async (c) => {
    const application = await deps.modules.competitionApplications.mine({
      actorId: c.get("actorId"),
      competitionId: asCompetitionId(c.req.param("competitionId")),
    });
    return jsonResponse(
      getMyCompetitionApplicationResponseSchema.parse({
        application: application ? competitionApplicationDto(application) : null,
      }),
    );
  });

  secured.post("/competitions/explore/:competitionId/application", async (c) => {
    const parsed = applyToCompetitionRequestSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);
    const result = await deps.modules.competitionApplications.apply({
      actorId: c.get("actorId"),
      competitionId: asCompetitionId(c.req.param("competitionId")),
      teamName: parsed.data.teamName,
      creationKey: parsed.data.creationKey,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      applyToCompetitionResponseSchema.parse(competitionApplicationDto(result.value)),
      201,
    );
  });

  secured.get("/competitions/mine", async (c) => {
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

  secured.get("/organizations/:organizationId/competitions", async (c) => {
    const organizationId = asOrganizationId(c.req.param("organizationId"));
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

  secured.post("/organizations/:organizationId/competitions", async (c) => {
    const parsed = createCompetitionDraftRequestSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);

    const organizationId = asOrganizationId(c.req.param("organizationId"));
    const result = await deps.modules.competitions.createDraft.execute({
      organizationId,
      actorId: c.get("actorId"),
      ...parsed.data,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      createCompetitionDraftResponseSchema.parse(competitionDraftDto(result.value)),
      201,
    );
  });

  secured.put("/organizations/:organizationId/competitions/:competitionId/cover", async (c) => {
    const parsed = updateCompetitionCoverRequestSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);
    const result = await deps.modules.competitions.updateCover.execute({
      actorId: c.get("actorId"),
      organizationId: asOrganizationId(c.req.param("organizationId")),
      competitionId: asCompetitionId(c.req.param("competitionId")),
      cover: parsed.data.cover,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      updateCompetitionCoverResponseSchema.parse(competitionDraftDto(result.value)),
    );
  });

  secured.get("/organizations/:organizationId/teams", async (c) => {
    const organizationId = asOrganizationId(c.req.param("organizationId"));
    const forbidden = await requireApiPermission(deps, {
      actorId: c.get("actorId"),
      permission: TEAM_PERMISSION.read,
      scope: { organizationId },
    });
    if (forbidden) return forbidden;
    const teams = await deps.modules.teams.listByOrganization.execute({ organizationId });
    return jsonResponse(listOrganizationTeamsResponseSchema.parse({ teams: teams.map(teamDto) }));
  });

  secured.get("/organizations/:organizationId/competitions/:competitionId", async (c) => {
    const organizationId = asOrganizationId(c.req.param("organizationId"));
    const competitionId = asCompetitionId(c.req.param("competitionId"));
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

  secured.get("/organizations/:organizationId/competitions/:competitionId/standings", async (c) => {
    const organizationId = asOrganizationId(c.req.param("organizationId"));
    const competitionId = asCompetitionId(c.req.param("competitionId"));
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

  secured.get(
    "/organizations/:organizationId/competitions/:competitionId/team-statistics",
    async (c) => {
      const organizationId = asOrganizationId(c.req.param("organizationId"));
      const competitionId = asCompetitionId(c.req.param("competitionId"));
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
    },
  );

  secured.get("/organizations/:organizationId/competitions/:competitionId/rankings", async (c) => {
    const organizationId = asOrganizationId(c.req.param("organizationId"));
    const competitionId = asCompetitionId(c.req.param("competitionId"));
    const query = getCompetitionRankingsQuerySchema.safeParse({
      kind: c.req.query("kind") || undefined,
    });
    if (!query.success) return validationErrorResponse(query.error.issues);
    let rankings;
    try {
      rankings = await deps.modules.statistics.useCases.getCompetitionRankings.execute(
        query.data.kind === undefined
          ? { actorId: c.get("actorId"), organizationId, competitionId }
          : {
              actorId: c.get("actorId"),
              organizationId,
              competitionId,
              kind: query.data.kind,
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

  secured.patch("/organizations/:organizationId/competitions/:competitionId", async (c) => {
    const parsed = updateCompetitionDraftRequestSchema.safeParse(
      await c.req.json().catch(() => null),
    );
    if (!parsed.success) return validationErrorResponse(parsed.error.issues);
    const organizationId = asOrganizationId(c.req.param("organizationId"));
    const competitionId = asCompetitionId(c.req.param("competitionId"));
    const result = await deps.modules.competitions.updateDraft.execute({
      actorId: c.get("actorId"),
      organizationId,
      competitionId,
      ...parsed.data,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return jsonResponse(
      updateCompetitionDraftResponseSchema.parse(competitionDraftDto(result.value)),
    );
  });

  app.route("/", secured);
}
