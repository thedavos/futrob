import {
  acceptEntryInvitationRequestSchema,
  acceptEntryInvitationResponseSchema,
  entryInvitationLinkResponseSchema,
  entryInvitationPreviewSchema,
  inviteTeamCaptainRequestSchema,
  listMyEntryInvitationsResponseSchema,
  listSentEntryInvitationsResponseSchema,
  searchEntryInviteesQuerySchema,
  searchEntryInviteesResponseSchema,
  sentEntryInvitationSchema,
  type AcceptEntryInvitationRequest,
  type AcceptEntryInvitationResponse,
  type EntryInvitationLinkResponse,
  type EntryInvitationPreviewDto,
  type InviteTeamCaptainRequest,
  type ListMyEntryInvitationsResponse,
  type ListSentEntryInvitationsResponse,
  type SearchEntryInviteesResponse,
  type SentEntryInvitationDto,
} from "@futrob/api-contracts";
import type { HttpClient, RequestOptions } from "../http.ts";
import { apiPath } from "../internal/path.ts";

/** A directed invitation is addressed by id; a shared link by its code. */
export type EntryInvitationTarget = { readonly invitationId: string } | { readonly code: string };

function targetPath(target: EntryInvitationTarget, ...rest: string[]): string {
  return "code" in target
    ? apiPath("entry-invitations", "links", target.code, ...rest)
    : apiPath("entry-invitations", target.invitationId, ...rest);
}

/** Entry invitations (ADR-0023): organizers invite teams; invited players answer. */
export function createEntryInvitationsResource(http: HttpClient) {
  function scoped(organizationId: string, competitionId: string, ...rest: string[]) {
    return apiPath(
      "organizations",
      organizationId,
      "competitions",
      competitionId,
      "entry-invitations",
      ...rest,
    );
  }

  return {
    async listSent(
      organizationId: string,
      competitionId: string,
      options: RequestOptions = {},
    ): Promise<ListSentEntryInvitationsResponse> {
      return http.request({
        path: scoped(organizationId, competitionId),
        method: "GET",
        options,
        parse: (data) => listSentEntryInvitationsResponseSchema.parse(data),
      });
    },

    async invite(
      organizationId: string,
      competitionId: string,
      input: InviteTeamCaptainRequest,
      options: RequestOptions = {},
    ): Promise<SentEntryInvitationDto> {
      const body = inviteTeamCaptainRequestSchema.parse(input);
      return http.request({
        path: scoped(organizationId, competitionId),
        method: "POST",
        body,
        options,
        parse: (data) => sentEntryInvitationSchema.parse(data),
      });
    },

    async revoke(
      organizationId: string,
      competitionId: string,
      invitationId: string,
      options: RequestOptions = {},
    ): Promise<void> {
      return http.request({
        path: scoped(organizationId, competitionId, invitationId),
        method: "DELETE",
        options,
        parse: () => undefined,
      });
    },

    async getLink(
      organizationId: string,
      competitionId: string,
      options: RequestOptions = {},
    ): Promise<EntryInvitationLinkResponse> {
      return http.request({
        path: scoped(organizationId, competitionId, "link"),
        method: "POST",
        options,
        parse: (data) => entryInvitationLinkResponseSchema.parse(data),
      });
    },

    async regenerateLink(
      organizationId: string,
      competitionId: string,
      options: RequestOptions = {},
    ): Promise<EntryInvitationLinkResponse> {
      return http.request({
        path: scoped(organizationId, competitionId, "link", "regenerate"),
        method: "POST",
        options,
        parse: (data) => entryInvitationLinkResponseSchema.parse(data),
      });
    },

    async searchInvitees(
      organizationId: string,
      competitionId: string,
      query: string,
      options: RequestOptions = {},
    ): Promise<SearchEntryInviteesResponse> {
      const { q } = searchEntryInviteesQuerySchema.parse({ q: query });
      return http.request({
        path: `${scoped(organizationId, competitionId, "candidates")}?${new URLSearchParams({ q })}`,
        method: "GET",
        options,
        parse: (data) => searchEntryInviteesResponseSchema.parse(data),
      });
    },

    async listMine(options: RequestOptions = {}): Promise<ListMyEntryInvitationsResponse> {
      return http.request({
        path: "/players/me/entry-invitations",
        method: "GET",
        options,
        parse: (data) => listMyEntryInvitationsResponseSchema.parse(data),
      });
    },

    async preview(
      target: EntryInvitationTarget,
      options: RequestOptions = {},
    ): Promise<EntryInvitationPreviewDto> {
      return http.request({
        path: targetPath(target),
        method: "GET",
        options,
        parse: (data) => entryInvitationPreviewSchema.parse(data),
      });
    },

    async accept(
      target: EntryInvitationTarget,
      input: AcceptEntryInvitationRequest,
      options: RequestOptions = {},
    ): Promise<AcceptEntryInvitationResponse> {
      const body = acceptEntryInvitationRequestSchema.parse(input);
      return http.request({
        path: targetPath(target, "accept"),
        method: "POST",
        body,
        options,
        parse: (data) => acceptEntryInvitationResponseSchema.parse(data),
      });
    },

    async decline(invitationId: string, options: RequestOptions = {}): Promise<void> {
      return http.request({
        path: apiPath("entry-invitations", invitationId, "decline"),
        method: "POST",
        options,
        parse: () => undefined,
      });
    },
  };
}

export type EntryInvitationsResource = ReturnType<typeof createEntryInvitationsResource>;
