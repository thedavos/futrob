import {
  acceptEntryInvitationResponseSchema,
  entryInvitationLinkResponseSchema,
  entryInvitationPreviewSchema,
  listMyEntryInvitationsResponseSchema,
  listSentEntryInvitationsResponseSchema,
  publicEntryInvitationLinkSchema,
  searchEntryInviteesResponseSchema,
  sentEntryInvitationSchema,
  type AcceptEntryInvitationRequest,
  type AcceptEntryInvitationResponse,
  type EntryInvitationLinkResponse,
  type EntryInvitationPreviewDto,
  type InviteTeamCaptainRequest,
  type ListMyEntryInvitationsResponse,
  type ListSentEntryInvitationsResponse,
  type PublicEntryInvitationLinkDto,
  type SearchEntryInviteesResponse,
  type SentEntryInvitationDto,
} from "@futrob/api-contracts";
import { z } from "zod";
import { requestBrowserJson } from "@/shared/infrastructure/http/browser-json-request.ts";
import { CompetitionsClientError } from "./competitions-browser-client.ts";

/** A directed invitation is addressed by id; a shared link by its code. */
export type EntryInvitationReference =
  | { readonly invitationId: string }
  | { readonly code: string };

const emptySchema = z.null().transform(() => undefined);

type EntryInvitationRequestBody = InviteTeamCaptainRequest | AcceptEntryInvitationRequest;

function request<T>(
  path: string,
  method: "GET" | "POST" | "DELETE",
  schema: z.ZodType<T>,
  body?: EntryInvitationRequestBody,
): Promise<T> {
  return requestBrowserJson({
    path,
    method,
    body,
    schema,
    fallbackCode: "competitions.entry_invitation_failed",
    createError: (status, error) => new CompetitionsClientError(status, error.code),
  });
}

function competitionPath(organizationId: string, competitionId: string, ...rest: string[]) {
  const tail = rest.map((segment) => `/${encodeURIComponent(segment)}`).join("");
  return `/api/v1/organizations/${encodeURIComponent(organizationId)}/competitions/${encodeURIComponent(competitionId)}/entry-invitations${tail}`;
}

function referencePath(reference: EntryInvitationReference, suffix = ""): string {
  return "code" in reference
    ? `/api/v1/entry-invitations/links/${encodeURIComponent(reference.code)}${suffix}`
    : `/api/v1/entry-invitations/${encodeURIComponent(reference.invitationId)}${suffix}`;
}

export function listSentEntryInvitations(
  organizationId: string,
  competitionId: string,
): Promise<ListSentEntryInvitationsResponse> {
  return request(
    competitionPath(organizationId, competitionId),
    "GET",
    listSentEntryInvitationsResponseSchema,
  );
}

export function inviteTeamCaptain(
  organizationId: string,
  competitionId: string,
  input: InviteTeamCaptainRequest,
): Promise<SentEntryInvitationDto> {
  return request(
    competitionPath(organizationId, competitionId),
    "POST",
    sentEntryInvitationSchema,
    input,
  );
}

export function revokeEntryInvitation(
  organizationId: string,
  competitionId: string,
  invitationId: string,
): Promise<void> {
  return request(
    competitionPath(organizationId, competitionId, invitationId),
    "DELETE",
    emptySchema,
  );
}

export function getEntryInvitationLink(
  organizationId: string,
  competitionId: string,
): Promise<EntryInvitationLinkResponse> {
  return request(
    competitionPath(organizationId, competitionId, "link"),
    "POST",
    entryInvitationLinkResponseSchema,
  );
}

export function regenerateEntryInvitationLink(
  organizationId: string,
  competitionId: string,
): Promise<EntryInvitationLinkResponse> {
  return request(
    competitionPath(organizationId, competitionId, "link", "regenerate"),
    "POST",
    entryInvitationLinkResponseSchema,
  );
}

export function searchEntryInvitees(
  organizationId: string,
  competitionId: string,
  query: string,
): Promise<SearchEntryInviteesResponse> {
  const search = new URLSearchParams({ q: query });
  return request(
    `${competitionPath(organizationId, competitionId, "candidates")}?${search.toString()}`,
    "GET",
    searchEntryInviteesResponseSchema,
  );
}

export function listMyEntryInvitations(): Promise<ListMyEntryInvitationsResponse> {
  return request(
    "/api/v1/players/me/entry-invitations",
    "GET",
    listMyEntryInvitationsResponseSchema,
  );
}

export function previewEntryInvitation(
  reference: EntryInvitationReference,
): Promise<EntryInvitationPreviewDto> {
  return request(referencePath(reference), "GET", entryInvitationPreviewSchema);
}

/** What a link shows to a signed-out visitor. */
export function getPublicEntryInvitationLink(code: string): Promise<PublicEntryInvitationLinkDto> {
  return request(referencePath({ code }, "/public"), "GET", publicEntryInvitationLinkSchema);
}

export function acceptEntryInvitation(
  reference: EntryInvitationReference,
  input: AcceptEntryInvitationRequest,
): Promise<AcceptEntryInvitationResponse> {
  return request(
    referencePath(reference, "/accept"),
    "POST",
    acceptEntryInvitationResponseSchema,
    input,
  );
}

export function declineEntryInvitation(invitationId: string): Promise<void> {
  return request(referencePath({ invitationId }, "/decline"), "POST", emptySchema);
}
