import { defineRoute, PLAN_GATED_DESCRIPTION } from "@/http/openapi/define-route.ts";
import { pathParams } from "@/http/openapi/path-params.ts";
import {
  AcceptCompetitionInvitationResponse,
  CompetitionApplication,
  CompetitionDraft,
  CompetitionEntry,
  CompetitionParticipantInput,
  CreateInvitationResponse,
  ExploreCompetition,
  ExploreCompetitionsResponse,
  ListAccessibleCompetitionsResponse,
  RegisterTeamEntryRequest,
  UpdateCompetitionDraftInput,
} from "@/http/openapi/components.ts";
import {
  acceptInvitationRequestSchema,
  applyToCompetitionRequestSchema,
  createCompetitionDraftRequestSchema,
  createCompetitionInvitationRequestSchema,
  exploreCompetitionsQuerySchema,
  getMyCompetitionApplicationResponseSchema,
  listCompetitionParticipantsResponseSchema,
  listOrganizationCompetitionsResponseSchema,
  updateCompetitionCoverRequestSchema,
} from "@futrob/api-contracts";

export const acceptCompetitionInvitationRoute = defineRoute({
  method: "post",
  path: "/competitions/invitations/accept",
  operationId: "acceptCompetitionInvitation",
  tags: ["competitions"],
  summary: "Accept a competition invitation and join its contextual membership",
  body: acceptInvitationRequestSchema,
  success: {
    status: 200,
    description: "Competition invitation accepted",
    schema: AcceptCompetitionInvitationResponse,
  },
  errors: [400, 401, 404, 429],
});

export const listOrganizationCompetitionsRoute = defineRoute({
  method: "get",
  path: "/organizations/{organizationId}/competitions",
  operationId: "listOrganizationCompetitions",
  tags: ["competitions"],
  summary: "List competitions in an organization",
  params: pathParams(["organizationId"]),
  success: {
    status: 200,
    description: "Organization competitions newest-first",
    schema: listOrganizationCompetitionsResponseSchema,
  },
  errors: [401, 403],
});

export const createCompetitionDraftRoute = defineRoute({
  method: "post",
  path: "/organizations/{organizationId}/competitions",
  operationId: "createCompetitionDraft",
  tags: ["competitions"],
  summary: "Create a competition draft in an organization",
  params: pathParams(["organizationId"]),
  body: createCompetitionDraftRequestSchema,
  success: { status: 201, description: "Competition draft created", schema: CompetitionDraft },
  errors: [400, 401, 402, 403],
  errorDescriptions: { 402: PLAN_GATED_DESCRIPTION },
});

export const listAccessibleCompetitionsRoute = defineRoute({
  method: "get",
  path: "/competitions/mine",
  operationId: "listAccessibleCompetitions",
  tags: ["competitions"],
  summary: "List competitions where the actor has a contextual membership",
  success: {
    status: 200,
    description: "Only competitions directly accessible to the actor",
    schema: ListAccessibleCompetitionsResponse,
  },
  errors: [401],
});

export const exploreCompetitionsRoute = defineRoute({
  method: "get",
  path: "/competitions/explore",
  operationId: "exploreCompetitions",
  tags: ["competitions"],
  summary: "List published competitions discoverable by any authenticated actor",
  query: exploreCompetitionsQuerySchema,
  success: {
    status: 200,
    description: "Discoverable competitions matching the filters",
    schema: ExploreCompetitionsResponse,
  },
  errors: [400, 401],
});

export const getExploreCompetitionRoute = defineRoute({
  method: "get",
  path: "/competitions/explore/{competitionId}",
  operationId: "getExploreCompetition",
  tags: ["competitions"],
  summary: "Get one discoverable competition",
  params: pathParams(["competitionId"]),
  success: { status: 200, description: "Discoverable competition", schema: ExploreCompetition },
  errors: [401, 404],
});

export const getMyCompetitionApplicationRoute = defineRoute({
  method: "get",
  path: "/competitions/explore/{competitionId}/application",
  operationId: "getMyCompetitionApplication",
  tags: ["competitions"],
  summary: "Get the actor's own entry in a discoverable competition, if any",
  params: pathParams(["competitionId"]),
  success: {
    status: 200,
    description: "The actor's application or null",
    schema: getMyCompetitionApplicationResponseSchema,
  },
  errors: [401],
});

export const applyToCompetitionRoute = defineRoute({
  method: "post",
  path: "/competitions/explore/{competitionId}/application",
  operationId: "applyToCompetition",
  tags: ["competitions"],
  summary:
    "Apply with a new team to a competition in registration; the actor becomes its captain and the entry stays pending",
  params: pathParams(["competitionId"]),
  body: applyToCompetitionRequestSchema,
  success: {
    status: 201,
    description: "Pending application (idempotent per creationKey)",
    schema: CompetitionApplication,
  },
  errors: [400, 401, 404, 409],
});

export const registerTeamEntryRoute = defineRoute({
  method: "post",
  path: "/organizations/{organizationId}/competitions/{competitionId}/entries",
  operationId: "registerTeamEntry",
  tags: ["competitions"],
  summary: "Register an existing organization team as a competition entry",
  params: pathParams(["organizationId", "competitionId"]),
  body: RegisterTeamEntryRequest,
  success: { status: 201, description: "Created entry", schema: CompetitionEntry },
  errors: [400, 401, 402, 403, 404, 409],
  errorDescriptions: { 402: PLAN_GATED_DESCRIPTION },
});

export const approveTeamEntryRoute = defineRoute({
  method: "post",
  path: "/organizations/{organizationId}/competitions/{competitionId}/entries/{entryId}/approve",
  operationId: "approveTeamEntry",
  tags: ["competitions"],
  summary: "Approve a pending competition team entry",
  params: pathParams(["organizationId", "competitionId", "entryId"]),
  success: { status: 200, description: "Approved entry", schema: CompetitionEntry },
  errors: [401, 402, 403, 404, 409],
  errorDescriptions: { 402: PLAN_GATED_DESCRIPTION },
});

export const rejectTeamEntryRoute = defineRoute({
  method: "post",
  path: "/organizations/{organizationId}/competitions/{competitionId}/entries/{entryId}/reject",
  operationId: "rejectTeamEntry",
  tags: ["competitions"],
  summary: "Reject a pending competition team entry",
  params: pathParams(["organizationId", "competitionId", "entryId"]),
  success: { status: 200, description: "Rejected entry", schema: CompetitionEntry },
  errors: [401, 403, 404, 409],
});

export const getCompetitionDraftRoute = defineRoute({
  method: "get",
  path: "/organizations/{organizationId}/competitions/{competitionId}",
  operationId: "getCompetitionDraft",
  tags: ["competitions"],
  summary: "Get an organization-scoped competition draft",
  params: pathParams(["organizationId", "competitionId"]),
  success: { status: 200, description: "Competition and current rules", schema: CompetitionDraft },
  errors: [401, 403, 404],
});

export const updateCompetitionDraftRoute = defineRoute({
  method: "patch",
  path: "/organizations/{organizationId}/competitions/{competitionId}",
  operationId: "updateCompetitionDraft",
  tags: ["competitions"],
  summary: "Update the editable structure and rules of a competition draft",
  params: pathParams(["organizationId", "competitionId"]),
  body: UpdateCompetitionDraftInput,
  success: { status: 200, description: "Saved draft", schema: CompetitionDraft },
  errors: [400, 402, 403, 404, 409],
  errorDescriptions: { 402: PLAN_GATED_DESCRIPTION },
});

export const listCompetitionParticipantsRoute = defineRoute({
  method: "get",
  path: "/organizations/{organizationId}/competitions/{competitionId}/participants",
  operationId: "listCompetitionParticipants",
  tags: ["competitions"],
  summary: "List draft participants",
  params: pathParams(["organizationId", "competitionId"]),
  success: {
    status: 200,
    description: "Participants",
    schema: listCompetitionParticipantsResponseSchema,
  },
  errors: [403],
});

export const addCompetitionParticipantRoute = defineRoute({
  method: "post",
  path: "/organizations/{organizationId}/competitions/{competitionId}/participants",
  operationId: "addCompetitionParticipant",
  tags: ["competitions"],
  summary: "Add an approved existing or inline-created Team",
  params: pathParams(["organizationId", "competitionId"]),
  body: CompetitionParticipantInput,
  success: { status: 201, description: "Approved participant", schema: CompetitionEntry },
  errors: [400, 402, 403, 409],
  errorDescriptions: { 402: PLAN_GATED_DESCRIPTION },
});

export const removeCompetitionParticipantRoute = defineRoute({
  method: "delete",
  path: "/organizations/{organizationId}/competitions/{competitionId}/participants/{entryId}",
  operationId: "removeCompetitionParticipant",
  tags: ["competitions"],
  summary: "Remove a participant while the competition is a draft",
  params: pathParams(["organizationId", "competitionId", "entryId"]),
  success: { status: 204, description: "Participant removed" },
  errors: [403, 404, 409],
});

export const publishCompetitionRoute = defineRoute({
  method: "post",
  path: "/organizations/{organizationId}/competitions/{competitionId}/publish",
  operationId: "publishCompetition",
  tags: ["competitions"],
  summary: "Publish and structurally lock a valid draft with at least two approved participants",
  params: pathParams(["organizationId", "competitionId"]),
  success: { status: 200, description: "Published competition", schema: CompetitionDraft },
  errors: [403, 404, 409],
});

export const openCompetitionRegistrationRoute = defineRoute({
  method: "post",
  path: "/organizations/{organizationId}/competitions/{competitionId}/registration/open",
  operationId: "openCompetitionRegistration",
  tags: ["competitions"],
  summary: "Open registration for a valid draft; format and rules freeze until it closes",
  params: pathParams(["organizationId", "competitionId"]),
  success: { status: 200, description: "Competition in registration", schema: CompetitionDraft },
  errors: [403, 404, 409],
});

export const closeCompetitionRegistrationRoute = defineRoute({
  method: "post",
  path: "/organizations/{organizationId}/competitions/{competitionId}/registration/close",
  operationId: "closeCompetitionRegistration",
  tags: ["competitions"],
  summary: "Close registration and return the competition to draft; entries are kept",
  params: pathParams(["organizationId", "competitionId"]),
  success: { status: 200, description: "Competition back in draft", schema: CompetitionDraft },
  errors: [403, 404, 409],
});

export const updateCompetitionCoverRoute = defineRoute({
  method: "put",
  path: "/organizations/{organizationId}/competitions/{competitionId}/cover",
  operationId: "updateCompetitionCover",
  tags: ["competitions"],
  summary: "Replace the cover in any status except archived",
  params: pathParams(["organizationId", "competitionId"]),
  body: updateCompetitionCoverRequestSchema,
  success: { status: 200, description: "Competition with its new cover", schema: CompetitionDraft },
  errors: [400, 403, 404, 409],
});

export const createCompetitionInvitationRoute = defineRoute({
  method: "post",
  path: "/organizations/{organizationId}/competitions/{competitionId}/invitations",
  operationId: "createCompetitionInvitation",
  tags: ["competitions"],
  summary: "Create an invitation scoped to a competition",
  params: pathParams(["organizationId", "competitionId"]),
  body: createCompetitionInvitationRequestSchema,
  success: {
    status: 201,
    description: "Competition invitation created",
    schema: CreateInvitationResponse,
  },
  errors: [400, 401, 403, 404],
});
