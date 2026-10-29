import { HttpClient, type HttpClientOptions } from "./http.ts";
import { createCompetitionsResource } from "./resources/competitions.ts";
import { createEncountersResource } from "./resources/encounters.ts";
import { createGameDataResource } from "./resources/game-data.ts";
import { createIdentityResource } from "./resources/identity.ts";
import { createMetaResource } from "./resources/meta.ts";
import { createOrganizationsResource } from "./resources/organizations.ts";
import { createPublicPortalResource } from "./resources/public-portal.ts";
import { createResultsResource } from "./resources/results.ts";
import { createTeamsResource } from "./resources/teams.ts";
import { createAuthorizationResource } from "./resources/authorization.ts";
import { createStatisticsResource } from "./resources/statistics.ts";
import { createPlayersResource } from "./resources/players.ts";
import { createActivitiesResource } from "./resources/activities.ts";
import { createEntryInvitationsResource } from "./resources/entry-invitations.ts";

export type CreateFutrobClientOptions = HttpClientOptions;

export function createFutrobClient(options: CreateFutrobClientOptions) {
  const http = new HttpClient(options);

  return {
    meta: createMetaResource(http),
    identity: createIdentityResource(http),
    gameData: createGameDataResource(http),
    organizations: createOrganizationsResource(http),
    competitions: createCompetitionsResource(http),
    teams: createTeamsResource(http),
    encounters: createEncountersResource(http),
    publicPortal: createPublicPortalResource(http),
    results: createResultsResource(http),
    authorization: createAuthorizationResource(http),
    statistics: createStatisticsResource(http),
    players: createPlayersResource(http),
    activities: createActivitiesResource(http),
    entryInvitations: createEntryInvitationsResource(http),
  };
}

export type FutrobClient = ReturnType<typeof createFutrobClient>;
