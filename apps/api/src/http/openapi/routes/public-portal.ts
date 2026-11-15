import { z } from "zod";
import {
  publicCompetitionKeySchema,
  publicOrganizationSlugSchema,
  publicRankingKindSchema,
} from "@futrob/api-contracts";
import {
  GetPublicBracketResponse,
  GetPublicCalendarResponse,
  GetPublicCompetitionResponse,
  GetPublicRankingResponse,
  GetPublicRulesResponse,
  GetPublicStandingsResponse,
  GetPublicTeamsResponse,
  ListPublicCompetitionsResponse,
} from "@/http/openapi/components.ts";
import { defineRoute } from "@/http/openapi/define-route.ts";

const publicKeyParams = z.object({
  organizationSlug: publicOrganizationSlugSchema,
  competitionKey: publicCompetitionKeySchema,
});

const CACHE_NOTE =
  "Anonymous and shareable: no session or service credentials are read. Successful responses send `Cache-Control: public, max-age=0, s-maxage=30, stale-while-revalidate=60`; errors are `no-store`.";

const NOT_PUBLISHED =
  "The organization or competition is unknown, the competition belongs to another organization, or it is not published";

const BASE = "/public/organizations/{organizationSlug}/competitions/{competitionKey}";

export const getPublicCompetitionRoute = defineRoute({
  method: "get",
  path: BASE,
  operationId: "getPublicCompetition",
  tags: ["public-portal"],
  summary: "Read the sanitized portada of a published competition",
  description: CACHE_NOTE,
  public: true,
  params: publicKeyParams,
  success: {
    status: 200,
    description: "Allowlisted portada fields",
    schema: GetPublicCompetitionResponse,
  },
  errors: [404],
  errorDescriptions: { 404: NOT_PUBLISHED },
});

export const getPublicStandingsRoute = defineRoute({
  method: "get",
  path: `${BASE}/standings`,
  operationId: "getPublicStandings",
  tags: ["public-portal"],
  summary: "Read the official table of a published competition",
  description: CACHE_NOTE,
  public: true,
  params: publicKeyParams,
  success: {
    status: 200,
    description: "Table rows with team names; empty before the first approved result",
    schema: GetPublicStandingsResponse,
  },
  errors: [404],
  errorDescriptions: { 404: NOT_PUBLISHED },
});

export const getPublicCalendarRoute = defineRoute({
  method: "get",
  path: `${BASE}/calendar`,
  operationId: "getPublicCalendar",
  tags: ["public-portal"],
  summary: "Read the calendar and official scores of a published competition",
  description: CACHE_NOTE,
  public: true,
  params: publicKeyParams,
  success: {
    status: 200,
    description:
      "Encounters with both teams known, earliest first, with the approved goals per match",
    schema: GetPublicCalendarResponse,
  },
  errors: [404],
  errorDescriptions: { 404: NOT_PUBLISHED },
});

export const getPublicTeamsRoute = defineRoute({
  method: "get",
  path: `${BASE}/teams`,
  operationId: "getPublicTeams",
  tags: ["public-portal"],
  summary: "List the approved teams of a published competition",
  description: CACHE_NOTE,
  public: true,
  params: publicKeyParams,
  success: {
    status: 200,
    description: "Team names, alphabetical",
    schema: GetPublicTeamsResponse,
  },
  errors: [404],
  errorDescriptions: { 404: NOT_PUBLISHED },
});

export const getPublicRulesRoute = defineRoute({
  method: "get",
  path: `${BASE}/rules`,
  operationId: "getPublicRules",
  tags: ["public-portal"],
  summary: "Read the public rules of a published competition",
  description: CACHE_NOTE,
  public: true,
  params: publicKeyParams,
  success: {
    status: 200,
    description: "Format, team range and per-stage scoring; no approval workflow settings",
    schema: GetPublicRulesResponse,
  },
  errors: [404],
  errorDescriptions: { 404: NOT_PUBLISHED },
});

export const getPublicBracketRoute = defineRoute({
  method: "get",
  path: `${BASE}/bracket`,
  operationId: "getPublicBracket",
  tags: ["public-portal"],
  summary: "Read the elimination bracket of a published competition",
  description: CACHE_NOTE,
  public: true,
  params: publicKeyParams,
  success: {
    status: 200,
    description: "Knockout and playoff stages; null without a fixture or an elimination stage",
    schema: GetPublicBracketResponse,
  },
  errors: [404],
  errorDescriptions: { 404: NOT_PUBLISHED },
});

export const getPublicRankingRoute = defineRoute({
  method: "get",
  path: `${BASE}/rankings/{kind}`,
  operationId: "getPublicRanking",
  tags: ["public-portal"],
  summary: "Read one official player ranking of a published competition",
  description: CACHE_NOTE,
  public: true,
  params: publicKeyParams.extend({ kind: publicRankingKindSchema }),
  success: {
    status: 200,
    description: "Players by their roster game account; empty before the first projection",
    schema: GetPublicRankingResponse,
  },
  errors: [400, 404],
  errorDescriptions: { 400: "Unknown ranking kind", 404: NOT_PUBLISHED },
});

export const listPublicCompetitionsRoute = defineRoute({
  method: "get",
  path: "/public/competitions",
  operationId: "listPublicCompetitions",
  tags: ["public-portal"],
  summary: "List every published competition by its public address",
  description: `Sitemap source: published, paused and finished competitions of every organization, newest first, with their public address and last update only. ${CACHE_NOTE}`,
  public: true,
  success: {
    status: 200,
    description: "Public addresses, no names or internal ids",
    schema: ListPublicCompetitionsResponse,
  },
});
