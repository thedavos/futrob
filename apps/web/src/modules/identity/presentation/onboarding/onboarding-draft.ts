"use client";

import type {
  GamePlatformDto,
  InspectCompetitionInvitationResponse,
  PlayerExternalClubSelectionInputDto,
  PlayerGameAccountInputDto,
} from "@futrob/api-contracts";

export interface SelectedExternalClubDraft extends PlayerExternalClubSelectionInputDto {
  readonly name: string;
  readonly imageUrl: string | null;
}

export interface OnboardingDraft {
  readonly organizationName: string;
  readonly organizationTimeZone: string;
  readonly organizationAccountStep: boolean;
  readonly invitationToken: string;
  readonly invitationPreview: InspectCompetitionInvitationResponse | null;
  readonly gameAccountIdentifier: string;
  readonly platform: GamePlatformDto | null;
  readonly gameEdition: string;
  readonly customGameEdition: boolean;
  readonly selectedExternalClub: SelectedExternalClubDraft | null;
}

export function createEmptyDraft(): OnboardingDraft {
  return {
    organizationName: "",
    organizationTimeZone: browserTimeZone(),
    organizationAccountStep: false,
    invitationToken: "",
    invitationPreview: null,
    gameAccountIdentifier: "",
    platform: null,
    gameEdition: "",
    customGameEdition: false,
    selectedExternalClub: null,
  };
}

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function playerAccountFromDraft(draft: OnboardingDraft): PlayerGameAccountInputDto | null {
  const identifier = draft.gameAccountIdentifier.trim();
  const gameEdition = draft.gameEdition.trim();
  if (!identifier && !draft.platform && !gameEdition) return null;
  if (!identifier || !draft.platform || !gameEdition) return null;
  return { identifier, platform: draft.platform, gameEdition };
}

export function externalClubLocatorFromDraft(
  draft: OnboardingDraft,
): PlayerExternalClubSelectionInputDto | null {
  const selected = draft.selectedExternalClub;
  if (!selected) return null;
  return {
    providerKey: selected.providerKey,
    externalClubId: selected.externalClubId,
    platform: selected.platform,
    gameEdition: selected.gameEdition,
  };
}
