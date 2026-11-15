import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  publicCompetitionKeySchema,
  publicOrganizationSlugSchema,
  publicRankingKindSchema,
  type GetPublicBracketResponse,
  type GetPublicCalendarResponse,
  type GetPublicCompetitionResponse,
  type GetPublicRankingResponse,
  type GetPublicRulesResponse,
  type GetPublicStandingsResponse,
  type GetPublicTeamsResponse,
} from "@futrob/api-contracts";
import { createFutrobClient, FutrobApiError, type PublicCompetitionRef } from "@futrob/sdk";
import { resolveProductApiBaseUrl } from "@/context/product-api-client.ts";
import type { PortalRead } from "../presentation/public-portal-model.ts";

const refInput = z.object({
  organizationSlug: publicOrganizationSlugSchema,
  competitionKey: publicCompetitionKeySchema,
});

const rankingInput = refInput.extend({ kind: publicRankingKindSchema });

/**
 * Anonymous reads for the public portal (ADR-0024). The client sends no service secret, actor
 * or cookie: the API serves these routes without auth, so SSR of a portal page never depends on
 * who is looking. A 404 stays distinguishable from a failure so the route can answer
 * "not found" without saying whether the competition exists.
 */
async function readPublic<T>(
  read: (client: ReturnType<typeof createFutrobClient>) => Promise<T>,
): Promise<PortalRead<T>> {
  try {
    const client = createFutrobClient({ baseUrl: resolveProductApiBaseUrl() });
    return { status: "ready", data: await read(client) };
  } catch (error) {
    if (error instanceof FutrobApiError && error.status === 404) return { status: "not_found" };
    return { status: "error" };
  }
}

const refOf = (data: z.infer<typeof refInput>): PublicCompetitionRef => ({
  organizationSlug: data.organizationSlug,
  competitionKey: data.competitionKey,
});

export const getPublicPortalCompetition = createServerFn({ method: "GET" })
  .validator(refInput)
  .handler(({ data }): Promise<PortalRead<GetPublicCompetitionResponse>> =>
    readPublic((client) => client.publicPortal.getCompetition(refOf(data))),
  );

export const getPublicPortalCalendar = createServerFn({ method: "GET" })
  .validator(refInput)
  .handler(({ data }): Promise<PortalRead<GetPublicCalendarResponse>> =>
    readPublic((client) => client.publicPortal.getCalendar(refOf(data))),
  );

export const getPublicPortalStandings = createServerFn({ method: "GET" })
  .validator(refInput)
  .handler(({ data }): Promise<PortalRead<GetPublicStandingsResponse>> =>
    readPublic((client) => client.publicPortal.getStandings(refOf(data))),
  );

export const getPublicPortalTeams = createServerFn({ method: "GET" })
  .validator(refInput)
  .handler(({ data }): Promise<PortalRead<GetPublicTeamsResponse>> =>
    readPublic((client) => client.publicPortal.getTeams(refOf(data))),
  );

export const getPublicPortalRules = createServerFn({ method: "GET" })
  .validator(refInput)
  .handler(({ data }): Promise<PortalRead<GetPublicRulesResponse>> =>
    readPublic((client) => client.publicPortal.getRules(refOf(data))),
  );

export const getPublicPortalBracket = createServerFn({ method: "GET" })
  .validator(refInput)
  .handler(({ data }): Promise<PortalRead<GetPublicBracketResponse>> =>
    readPublic((client) => client.publicPortal.getBracket(refOf(data))),
  );

export const getPublicPortalRanking = createServerFn({ method: "GET" })
  .validator(rankingInput)
  .handler(({ data }): Promise<PortalRead<GetPublicRankingResponse>> =>
    readPublic((client) => client.publicPortal.getRanking(refOf(data), data.kind)),
  );
