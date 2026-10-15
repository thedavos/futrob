import { defineRoute } from "@/http/openapi/define-route.ts";
import { pathParams } from "@/http/openapi/path-params.ts";
import {
  AcceptEntryInvitationRequest,
  AcceptEntryInvitationResponse,
  EntryInvitationLinkResponse,
  EntryInvitationPreview,
  InviteTeamCaptainRequest,
  ListMyEntryInvitationsResponse,
  ListSentEntryInvitationsResponse,
  PublicEntryInvitationLink,
  SearchEntryInviteesResponse,
  SentEntryInvitation,
} from "@/http/openapi/components.ts";
import { searchEntryInviteesQuerySchema } from "@futrob/api-contracts";

const ENTRY_INVITATIONS =
  "/organizations/{organizationId}/competitions/{competitionId}/entry-invitations";
const scopeParams = ["organizationId", "competitionId"] as const;

const ACCEPT_DESCRIPTION =
  "Creates the Team with `teamName`, its approved entry and the actor's captaincy " +
  "(ADR-0023). Idempotent under `creationKey`. Failures: 400 " +
  "`competitions.entry_invitation_revoked|expired`; 403 `competitions.entry_invitation_forbidden`; " +
  "404 `competitions.entry_invitation_not_found`; 409 `competitions.capacity_reached`, " +
  "`competitions.not_editable`, `competitions.entry_invitation_already_decided`, " +
  "`teams.roster_competition_conflict`.";

export const listSentEntryInvitationsRoute = defineRoute({
  method: "get",
  path: ENTRY_INVITATIONS,
  operationId: "listSentEntryInvitations",
  tags: ["competitions"],
  summary: "List the directed entry invitations of a competition",
  description: "Requires `competitions.invitations.manage`. Newest first.",
  params: pathParams(scopeParams),
  success: { status: 200, description: "Invitations", schema: ListSentEntryInvitationsResponse },
  errors: [401, 403],
});

export const inviteTeamCaptainRoute = defineRoute({
  method: "post",
  path: ENTRY_INVITATIONS,
  operationId: "inviteTeamCaptain",
  tags: ["competitions"],
  summary: "Invite a player to bring a team to the competition",
  description:
    "Requires `competitions.invitations.manage` and a competition in draft or registration. " +
    "Failures: 404 `competitions.entry_invitee_not_found`; 409 " +
    "`competitions.entry_invitation_pending_conflict`, `competitions.not_editable`.",
  params: pathParams(scopeParams),
  body: InviteTeamCaptainRequest,
  success: { status: 201, description: "Invitation sent", schema: SentEntryInvitation },
  errors: [400, 401, 403, 404, 409],
});

export const revokeEntryInvitationRoute = defineRoute({
  method: "delete",
  path: `${ENTRY_INVITATIONS}/{invitationId}`,
  operationId: "revokeEntryInvitation",
  tags: ["competitions"],
  summary: "Revoke a pending entry invitation",
  params: pathParams([...scopeParams, "invitationId"]),
  success: { status: 204, description: "Revoked" },
  errors: [401, 403, 404, 409],
});

export const ensureEntryInvitationLinkRoute = defineRoute({
  method: "post",
  path: `${ENTRY_INVITATIONS}/link`,
  operationId: "ensureEntryInvitationLink",
  tags: ["competitions"],
  summary: "Get the competition's invitation link, creating it the first time",
  params: pathParams(scopeParams),
  success: { status: 200, description: "Active link", schema: EntryInvitationLinkResponse },
  errors: [401, 403, 409],
});

export const regenerateEntryInvitationLinkRoute = defineRoute({
  method: "post",
  path: `${ENTRY_INVITATIONS}/link/regenerate`,
  operationId: "regenerateEntryInvitationLink",
  tags: ["competitions"],
  summary: "Revoke the active link and issue a new one",
  params: pathParams(scopeParams),
  success: { status: 201, description: "New link", schema: EntryInvitationLinkResponse },
  errors: [401, 403, 409],
});

export const searchEntryInviteesRoute = defineRoute({
  method: "get",
  path: `${ENTRY_INVITATIONS}/candidates`,
  operationId: "searchEntryInvitees",
  tags: ["competitions"],
  summary: "Search players to invite by the start of their gamertag",
  description: "At least 3 characters; at most 10 players.",
  params: pathParams(scopeParams),
  query: searchEntryInviteesQuerySchema,
  success: { status: 200, description: "Players", schema: SearchEntryInviteesResponse },
  errors: [400, 401, 403, 429],
});

export const listMyEntryInvitationsRoute = defineRoute({
  method: "get",
  path: "/players/me/entry-invitations",
  operationId: "listMyEntryInvitations",
  tags: ["competitions"],
  summary: "List the entry invitations addressed to the actor",
  success: { status: 200, description: "Invitations", schema: ListMyEntryInvitationsResponse },
  errors: [401],
});

export const previewEntryInvitationRoute = defineRoute({
  method: "get",
  path: "/entry-invitations/{invitationId}",
  operationId: "previewEntryInvitation",
  tags: ["competitions"],
  summary: "Preview a directed invitation",
  params: pathParams(["invitationId"]),
  success: { status: 200, description: "Invitation preview", schema: EntryInvitationPreview },
  errors: [400, 401, 403, 404, 409],
});

export const acceptEntryInvitationRoute = defineRoute({
  method: "post",
  path: "/entry-invitations/{invitationId}/accept",
  operationId: "acceptEntryInvitation",
  tags: ["competitions"],
  summary: "Accept a directed invitation",
  description: ACCEPT_DESCRIPTION,
  params: pathParams(["invitationId"]),
  body: AcceptEntryInvitationRequest,
  success: { status: 201, description: "Team entered", schema: AcceptEntryInvitationResponse },
  errors: [400, 401, 403, 404, 409, 429],
});

export const declineEntryInvitationRoute = defineRoute({
  method: "post",
  path: "/entry-invitations/{invitationId}/decline",
  operationId: "declineEntryInvitation",
  tags: ["competitions"],
  summary: "Decline a directed invitation",
  params: pathParams(["invitationId"]),
  success: { status: 204, description: "Declined" },
  errors: [401, 403, 404, 409],
});

export const previewEntryInvitationLinkRoute = defineRoute({
  method: "get",
  path: "/entry-invitations/links/{code}",
  operationId: "previewEntryInvitationLink",
  tags: ["competitions"],
  summary: "Preview an invitation link",
  params: pathParams(["code"]),
  success: { status: 200, description: "Invitation preview", schema: EntryInvitationPreview },
  errors: [400, 401, 403, 404, 409],
});

export const previewPublicEntryInvitationLinkRoute = defineRoute({
  method: "get",
  path: "/internal/entry-invitations/links/{code}/public",
  operationId: "previewPublicEntryInvitationLink",
  tags: ["competitions"],
  summary: "Preview an invitation link before signing in",
  description:
    "Service-only endpoint authenticated with the internal bearer secret; takes no actor. Returns presentation data only, and the same `invalid` reason for an unknown and a revoked code.",
  params: pathParams(["code"]),
  success: {
    status: 200,
    description: "What the link shows to a signed-out visitor",
    schema: PublicEntryInvitationLink,
  },
  errors: [400, 401],
});

export const acceptEntryInvitationLinkRoute = defineRoute({
  method: "post",
  path: "/entry-invitations/links/{code}/accept",
  operationId: "acceptEntryInvitationLink",
  tags: ["competitions"],
  summary: "Enter a team through an invitation link",
  description: ACCEPT_DESCRIPTION,
  params: pathParams(["code"]),
  body: AcceptEntryInvitationRequest,
  success: { status: 201, description: "Team entered", schema: AcceptEntryInvitationResponse },
  errors: [400, 401, 403, 404, 409, 429],
});
