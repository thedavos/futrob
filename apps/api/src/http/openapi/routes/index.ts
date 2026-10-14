import * as authorization from "@/http/openapi/routes/authorization.ts";
import * as competitions from "@/http/openapi/routes/competitions.ts";
import * as entryInvitations from "@/http/openapi/routes/entry-invitations.ts";
import * as encounters from "@/http/openapi/routes/encounters.ts";
import * as fixtures from "@/http/openapi/routes/fixtures.ts";
import * as gameData from "@/http/openapi/routes/game-data.ts";
import * as identity from "@/http/openapi/routes/identity.ts";
import * as meta from "@/http/openapi/routes/meta.ts";
import * as notifications from "@/http/openapi/routes/notifications.ts";
import * as organizations from "@/http/openapi/routes/organizations.ts";
import * as players from "@/http/openapi/routes/players.ts";
import * as results from "@/http/openapi/routes/results.ts";
import * as statistics from "@/http/openapi/routes/statistics.ts";
import * as teams from "@/http/openapi/routes/teams.ts";

export * from "@/http/openapi/routes/authorization.ts";
export * from "@/http/openapi/routes/competitions.ts";
export * from "@/http/openapi/routes/encounters.ts";
export * from "@/http/openapi/routes/entry-invitations.ts";
export * from "@/http/openapi/routes/fixtures.ts";
export * from "@/http/openapi/routes/game-data.ts";
export * from "@/http/openapi/routes/identity.ts";
export * from "@/http/openapi/routes/meta.ts";
export * from "@/http/openapi/routes/notifications.ts";
export * from "@/http/openapi/routes/organizations.ts";
export * from "@/http/openapi/routes/players.ts";
export * from "@/http/openapi/routes/results.ts";
export * from "@/http/openapi/routes/statistics.ts";
export * from "@/http/openapi/routes/teams.ts";

export const openApiRoutes = [
  ...Object.values(results),
  ...Object.values(meta),
  ...Object.values(gameData),
  ...Object.values(players),
  ...Object.values(identity),
  ...Object.values(organizations),
  ...Object.values(competitions),
  ...Object.values(entryInvitations),
  ...Object.values(fixtures),
  ...Object.values(statistics),
  ...Object.values(notifications),
  ...Object.values(teams),
  ...Object.values(encounters),
  ...Object.values(authorization),
] as const;
