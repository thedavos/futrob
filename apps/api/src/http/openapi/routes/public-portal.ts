import { z } from "zod";
import { publicCompetitionKeySchema } from "@futrob/api-contracts";
import {
  GetPublicCalendarResponse,
  GetPublicCompetitionResponse,
  GetPublicStandingsResponse,
} from "@/http/openapi/components.ts";
import { defineRoute } from "@/http/openapi/define-route.ts";

const publicKeyParams = z.object({ publicKey: publicCompetitionKeySchema });

const CACHE_NOTE =
  "Anonymous and shareable: no session or service credentials are read. Successful responses send `Cache-Control: public, max-age=0, s-maxage=30, stale-while-revalidate=60`; errors are `no-store`.";

const NOT_PUBLISHED = "The key is unknown or the competition is not published";

export const getPublicCompetitionRoute = defineRoute({
  method: "get",
  path: "/public/competitions/{publicKey}",
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
  path: "/public/competitions/{publicKey}/standings",
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
  path: "/public/competitions/{publicKey}/calendar",
  operationId: "getPublicCalendar",
  tags: ["public-portal"],
  summary: "Read the calendar of a published competition",
  description: CACHE_NOTE,
  public: true,
  params: publicKeyParams,
  success: {
    status: 200,
    description: "Encounters with both teams known, earliest first",
    schema: GetPublicCalendarResponse,
  },
  errors: [404],
  errorDescriptions: { 404: NOT_PUBLISHED },
});
