import {
  acceptEntryInvitationRequestSchema,
  acceptEntryInvitationResponseSchema,
  entryInvitationLinkResponseSchema,
  entryInvitationPreviewSchema,
  inviteTeamCaptainRequestSchema,
  listMyEntryInvitationsResponseSchema,
  listSentEntryInvitationsResponseSchema,
  publicEntryInvitationLinkSchema,
  searchEntryInviteesResponseSchema,
  sentEntryInvitationSchema,
} from "@futrob/api-contracts";
import { namedSchema } from "@/http/openapi/named-schema.ts";

export const SentEntryInvitation = namedSchema("SentEntryInvitation", sentEntryInvitationSchema);
export const ListSentEntryInvitationsResponse = namedSchema(
  "ListSentEntryInvitationsResponse",
  listSentEntryInvitationsResponseSchema,
);
export const InviteTeamCaptainRequest = namedSchema(
  "InviteTeamCaptainRequest",
  inviteTeamCaptainRequestSchema,
);
export const EntryInvitationLinkResponse = namedSchema(
  "EntryInvitationLinkResponse",
  entryInvitationLinkResponseSchema,
);
export const SearchEntryInviteesResponse = namedSchema(
  "SearchEntryInviteesResponse",
  searchEntryInviteesResponseSchema,
);
export const EntryInvitationPreview = namedSchema(
  "EntryInvitationPreview",
  entryInvitationPreviewSchema,
);
export const PublicEntryInvitationLink = namedSchema(
  "PublicEntryInvitationLink",
  publicEntryInvitationLinkSchema,
);
export const AcceptEntryInvitationRequest = namedSchema(
  "AcceptEntryInvitationRequest",
  acceptEntryInvitationRequestSchema,
);
export const AcceptEntryInvitationResponse = namedSchema(
  "AcceptEntryInvitationResponse",
  acceptEntryInvitationResponseSchema,
);
export const ListMyEntryInvitationsResponse = namedSchema(
  "ListMyEntryInvitationsResponse",
  listMyEntryInvitationsResponseSchema,
);
