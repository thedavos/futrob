import type { Hono } from "hono";
import {
  getPublicCalendarResponseSchema,
  getPublicCompetitionResponseSchema,
  getPublicStandingsResponseSchema,
} from "@futrob/api-contracts";
import { asPublicCompetitionKey } from "@futrob/public-portal";
import type { AppDeps } from "@/app.ts";
import { failureToHttp } from "@/http/errors.ts";
import { createOpenApiRouter } from "@/http/openapi/router.ts";
import {
  getPublicCalendarRoute,
  getPublicCompetitionRoute,
  getPublicStandingsRoute,
} from "@/http/openapi/routes/public-portal.ts";
import { publicJsonResponse } from "@/utils/http-response.ts";

/**
 * Anonymous reads of a published competition (ADR-0024). This router has no service-auth
 * middleware on purpose: it serves only allowlisted projections from `@futrob/public-portal`,
 * and every response body is re-parsed by a strict schema before it leaves.
 */
export function registerPublicPortalRoutes(app: Hono, deps: AppDeps): void {
  const router = createOpenApiRouter();
  const { publicPortal } = deps.modules;

  router.openapi(getPublicCompetitionRoute, async (c) => {
    const result = await publicPortal.getCompetition.execute({
      key: asPublicCompetitionKey(c.req.valid("param").publicKey),
    });
    if (!result.isOk()) return failureToHttp(result.error);
    return publicJsonResponse(
      getPublicCompetitionResponseSchema.parse({ competition: result.value }),
    );
  });

  router.openapi(getPublicStandingsRoute, async (c) => {
    const result = await publicPortal.getStandings.execute({
      key: asPublicCompetitionKey(c.req.valid("param").publicKey),
    });
    if (!result.isOk()) return failureToHttp(result.error);
    const { rows, updatedAt } = result.value;
    return publicJsonResponse(
      getPublicStandingsResponseSchema.parse({
        standings: { rows, updatedAt: updatedAt ? updatedAt.toISOString() : null },
      }),
    );
  });

  router.openapi(getPublicCalendarRoute, async (c) => {
    const result = await publicPortal.getCalendar.execute({
      key: asPublicCompetitionKey(c.req.valid("param").publicKey),
    });
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
          })),
        },
      }),
    );
  });

  app.route("/", router);
}
