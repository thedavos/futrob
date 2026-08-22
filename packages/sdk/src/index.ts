export { createFutrobClient, type CreateFutrobClientOptions, type FutrobClient } from "./client.ts";
export {
  FutrobApiError,
  FutrobRequestTimeoutError,
  parseApiErrorBody,
  parseRetryAfterSeconds,
} from "./errors.ts";
export {
  HttpClient,
  type HttpClientOptions,
  type HttpRequestInput,
  type RequestOptions,
} from "./http.ts";
export { httpResponseBodySchema, type HttpResponseBody } from "./wire-body.ts";
export { buildRosterInvitationShareUrl } from "./roster-invitation-share-url.ts";

export type { AuthorizationResource } from "./resources/authorization.ts";
export type { CompetitionsResource } from "./resources/competitions.ts";
export type { EncountersResource } from "./resources/encounters.ts";
export type { GameDataResource } from "./resources/game-data.ts";
export type { IdentityResource } from "./resources/identity.ts";
export type { MetaResource } from "./resources/meta.ts";
export type { OrganizationsResource } from "./resources/organizations.ts";
export type { PlayersResource } from "./resources/players.ts";
export type { ResultsResource } from "./resources/results.ts";
export type { RosterInvitationsResource } from "./resources/roster-invitations.ts";
export type { RostersResource } from "./resources/rosters.ts";
export type { StatisticsResource, GetMyRecentMatchInput } from "./resources/statistics.ts";
export type { TeamsResource } from "./resources/teams.ts";
export type { TeamExternalClubsResource } from "./resources/external-clubs.ts";
