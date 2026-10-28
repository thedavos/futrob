import { defineRoute } from "@/http/openapi/define-route.ts";
import { pathParams, providerKeyPathParams } from "@/http/openapi/path-params.ts";
import {
  EnqueueProviderSyncJobRequest,
  ExternalClub,
  GetClubMatchesResponse,
  ProviderHealthResponse,
  EnqueueDueProviderSyncsResponse,
  ProviderSyncJobResponse,
  SearchClubsResponse,
} from "@/http/openapi/components.ts";
import {
  getClubMatchesQuerySchema,
  getClubQuerySchema,
  searchClubsQuerySchema,
} from "@futrob/api-contracts";

export const searchExternalClubsRoute = defineRoute({
  method: "get",
  path: "/game-data/clubs/search",
  operationId: "searchExternalClubs",
  tags: ["game-data"],
  summary: "Search external clubs via a game-data provider",
  query: searchClubsQuerySchema,
  success: { status: 200, description: "Matching clubs", schema: SearchClubsResponse },
  errors: [400, 401, 429, 502],
});

export const getExternalClubRoute = defineRoute({
  method: "get",
  path: "/game-data/clubs/{externalClubId}",
  operationId: "getExternalClub",
  tags: ["game-data"],
  summary: "Get external club info",
  params: pathParams(["externalClubId"]),
  query: getClubQuerySchema,
  success: { status: 200, description: "Club", schema: ExternalClub },
  errors: [400, 401, 404, 502],
});

export const getRecentProviderMatchesRoute = defineRoute({
  method: "get",
  path: "/game-data/clubs/{externalClubId}/matches",
  operationId: "getRecentProviderMatches",
  tags: ["game-data"],
  summary: "List recent provider matches for a club",
  params: pathParams(["externalClubId"]),
  query: getClubMatchesQuerySchema,
  success: { status: 200, description: "Matches", schema: GetClubMatchesResponse },
  errors: [400, 401, 502],
});

export const getProviderHealthRoute = defineRoute({
  method: "get",
  path: "/internal/game-data/providers/{providerKey}/health",
  operationId: "getProviderHealth",
  tags: ["game-data"],
  summary: "Get a sanitized provider health snapshot",
  params: providerKeyPathParams,
  success: {
    status: 200,
    description: "Sanitized provider health",
    schema: ProviderHealthResponse,
  },
  errors: [401, 403],
});

export const persistProviderSyncJobRoute = defineRoute({
  method: "post",
  path: "/internal/game-data/sync-jobs",
  operationId: "persistProviderSyncJob",
  tags: ["game-data"],
  summary: "Persist a tenant-scoped provider synchronization job",
  description: "Service-only endpoint authenticated with the internal bearer secret.",
  body: EnqueueProviderSyncJobRequest,
  success: {
    status: 202,
    description: "Job persisted or active duplicate returned",
    schema: ProviderSyncJobResponse,
  },
  errors: [400, 401],
});

export const runProviderSyncJobRoute = defineRoute({
  method: "post",
  path: "/internal/game-data/sync-jobs/{jobId}/run",
  operationId: "runProviderSyncJob",
  tags: ["game-data"],
  summary: "Claim and run one provider synchronization job attempt",
  description: "Service-only Queue target authenticated with the internal bearer secret.",
  params: pathParams(["jobId"]),
  success: {
    status: 200,
    description: "Current durable job state",
    schema: ProviderSyncJobResponse,
  },
  errors: [401, 409],
});

export const enqueueDueProviderSyncsRoute = defineRoute({
  method: "post",
  path: "/internal/game-data/sync-jobs/enqueue-due",
  operationId: "enqueueDueProviderSyncs",
  tags: ["game-data"],
  summary: "Enqueue provider syncs for official slots inside the candidate window",
  description:
    "Service-only Cron target authenticated with the internal bearer secret. Selects connected EA clubs on scheduled or awaiting-selection slots whose start is inside the candidate window, and persists one recent-matches job per club and match type. An active job or a finished job inside the cooldown is not duplicated. The response lists only jobs created by this call so the caller can publish them. Retry converges.",
  success: {
    status: 200,
    description: "Jobs created in this tick, plus counts of covered and deferred targets",
    schema: EnqueueDueProviderSyncsResponse,
  },
  errors: [401],
});

export const recoverNextProviderSyncJobRoute = defineRoute({
  method: "post",
  path: "/internal/game-data/sync-jobs/run-next",
  operationId: "recoverNextProviderSyncJob",
  tags: ["game-data"],
  summary: "Run the next ready provider synchronization job",
  description:
    "Service-only Cron recovery path for durable jobs left ready after an interrupted Queue publication or delivery.",
  success: {
    status: 200,
    description: "Current durable job state",
    schema: ProviderSyncJobResponse,
  },
  extraResponses: { 204: { description: "No ready job" } },
  errors: [401],
});
