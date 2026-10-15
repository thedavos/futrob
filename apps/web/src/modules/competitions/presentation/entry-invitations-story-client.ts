import type {
  AcceptEntryInvitationResponse,
  EntryInvitationLinkResponse,
  EntryInvitationPreviewDto,
  ListMyEntryInvitationsResponse,
  ListSentEntryInvitationsResponse,
  PublicEntryInvitationLinkDto,
  SearchEntryInviteesResponse,
  SentEntryInvitationDto,
} from "@futrob/api-contracts";

/** Storybook stand-in for `entry-invitations-browser-client`: no network, fixed data. */

export type EntryInvitationReference =
  | { readonly invitationId: string }
  | { readonly code: string };

let myInvitations: ListMyEntryInvitationsResponse = { invitations: [] };

export function configureEntryInvitationsStory(next: {
  readonly myInvitations?: ListMyEntryInvitationsResponse;
}): void {
  myInvitations = next.myInvitations ?? { invitations: [] };
}

const unavailable = (): Promise<never> => Promise.reject(new Error("Not available in this story"));

export function listSentEntryInvitations(): Promise<ListSentEntryInvitationsResponse> {
  return Promise.resolve({ invitations: [] });
}

export function inviteTeamCaptain(): Promise<SentEntryInvitationDto> {
  return unavailable();
}

export function revokeEntryInvitation(): Promise<void> {
  return Promise.resolve();
}

export function getEntryInvitationLink(): Promise<EntryInvitationLinkResponse> {
  return unavailable();
}

export function regenerateEntryInvitationLink(): Promise<EntryInvitationLinkResponse> {
  return unavailable();
}

export function searchEntryInvitees(): Promise<SearchEntryInviteesResponse> {
  return Promise.resolve({ players: [] });
}

export function listMyEntryInvitations(): Promise<ListMyEntryInvitationsResponse> {
  return Promise.resolve(myInvitations);
}

export function previewEntryInvitation(): Promise<EntryInvitationPreviewDto> {
  return unavailable();
}

export function getPublicEntryInvitationLink(): Promise<PublicEntryInvitationLinkDto> {
  return unavailable();
}

export function acceptEntryInvitation(): Promise<AcceptEntryInvitationResponse> {
  return unavailable();
}

export function declineEntryInvitation(): Promise<void> {
  return Promise.resolve();
}
