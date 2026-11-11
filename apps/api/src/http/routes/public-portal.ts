import type { Hono } from "hono";
import {
  getPublicBracketResponseSchema,
  getPublicCalendarResponseSchema,
  getPublicCompetitionResponseSchema,
  getPublicRankingResponseSchema,
  getPublicRulesResponseSchema,
  getPublicStandingsResponseSchema,
  getPublicTeamsResponseSchema,
} from "@futrob/api-contracts";
import { asPublicCompetitionKey, type PublicBracket } from "@futrob/public-portal";
import type { AppDeps } from "@/app.ts";
import { failureToHttp } from "@/http/errors.ts";
import { createOpenApiRouter } from "@/http/openapi/router.ts";
import {
  getPublicBracketRoute,
  getPublicCalendarRoute,
  getPublicCompetitionRoute,
  getPublicRankingRoute,
  getPublicRulesRoute,
  getPublicStandingsRoute,
  getPublicTeamsRoute,
} from "@/http/openapi/routes/public-portal.ts";
import { publicJsonResponse } from "@/utils/http-response.ts";

const keyOf = (params: { readonly organizationSlug: string; readonly competitionKey: string }) =>
  asPublicCompetitionKey(params.organizationSlug, params.competitionKey);

/**
 * Anonymous reads of a published competition (ADR-0024). This router has no service-auth
 * middleware on purpose: it serves only allowlisted projections from `@futrob/public-portal`,
 * and every response body is re-parsed by a strict schema before it leaves.
 */
export function registerPublicPortalRoutes(app: Hono, deps: AppDeps): void {
  const router = createOpenApiRouter();
  const { publicPortal } = deps.modules;

  router.openapi(getPublicCompetitionRoute, async (c) => {
    const result = await publicPortal.getCompetition.execute({ key: keyOf(c.req.valid("param")) });
    if (!result.isOk()) return failureToHttp(result.error);
    return publicJsonResponse(
      getPublicCompetitionResponseSchema.parse({ competition: result.value }),
    );
  });

  router.openapi(getPublicStandingsRoute, async (c) => {
    const result = await publicPortal.getStandings.execute({ key: keyOf(c.req.valid("param")) });
    if (!result.isOk()) return failureToHttp(result.error);
    const { rows, swiss, updatedAt } = result.value;
    return publicJsonResponse(
      getPublicStandingsResponseSchema.parse({
        standings: { rows, swiss, updatedAt: updatedAt ? updatedAt.toISOString() : null },
      }),
    );
  });

  router.openapi(getPublicCalendarRoute, async (c) => {
    const result = await publicPortal.getCalendar.execute({ key: keyOf(c.req.valid("param")) });
    if (!result.isOk()) return failureToHttp(result.error);
    return publicJsonResponse(
      getPublicCalendarResponseSchema.parse({
        calendar: {
          timeZone: result.value.timeZone,
          entries: result.value.entries.map((entry) => ({
            roundNumber: entry.roundNumber,
            scheduledStartAt: entry.scheduledStartAt.toISOString(),
            homeTeamName: entry.homeTeamName,
            awayTeamName: entry.awayTeamName,
            status: entry.status,
            score: entry.score,
          })),
        },
      }),
    );
  });

  router.openapi(getPublicTeamsRoute, async (c) => {
    const result = await publicPortal.getTeams.execute({ key: keyOf(c.req.valid("param")) });
    if (!result.isOk()) return failureToHttp(result.error);
    return publicJsonResponse(getPublicTeamsResponseSchema.parse(result.value));
  });

  router.openapi(getPublicRulesRoute, async (c) => {
    const result = await publicPortal.getRules.execute({ key: keyOf(c.req.valid("param")) });
    if (!result.isOk()) return failureToHttp(result.error);
    return publicJsonResponse(getPublicRulesResponseSchema.parse({ rules: result.value }));
  });

  router.openapi(getPublicBracketRoute, async (c) => {
    const result = await publicPortal.getBracket.execute({ key: keyOf(c.req.valid("param")) });
    if (!result.isOk()) return failureToHttp(result.error);
    return publicJsonResponse(
      getPublicBracketResponseSchema.parse({ bracket: bracketToWire(result.value) }),
    );
  });

  router.openapi(getPublicRankingRoute, async (c) => {
    const params = c.req.valid("param");
    const result = await publicPortal.getRankings.execute({
      key: keyOf(params),
      kind: params.kind,
    });
    if (!result.isOk()) return failureToHttp(result.error);
    const { kind, rows, updatedAt } = result.value;
    return publicJsonResponse(
      getPublicRankingResponseSchema.parse({
        ranking: { kind, rows, updatedAt: updatedAt ? updatedAt.toISOString() : null },
      }),
    );
  });

  app.route("/", router);
}

function bracketToWire(bracket: PublicBracket | null) {
  if (!bracket) return null;
  return {
    timeZone: bracket.timeZone,
    stages: bracket.stages.map((stage) => ({
      kind: stage.kind,
      rounds: stage.rounds.map((round) => ({
        number: round.number,
        scheduledStartAt: round.scheduledStartAt.toISOString(),
        encounters: round.encounters.map((encounter) => ({
          ...encounter,
          scheduledStartAt: encounter.scheduledStartAt.toISOString(),
        })),
      })),
    })),
  };
}
