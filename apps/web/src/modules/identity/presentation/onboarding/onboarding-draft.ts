"use client";

import type {
  CompetitionDraftInputDto,
  CompetitionFormatDto,
  CompetitionRegionDto,
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
  readonly competitionName: string;
  readonly competitionPlatform: GamePlatformDto | null;
  readonly competitionRegion: CompetitionRegionDto | null;
  readonly competitionTimeZone: string;
  readonly competitionFormat: CompetitionFormatDto | null;
  readonly competitionGameEdition: string;
  readonly customCompetitionGameEdition: boolean;
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
    competitionName: "",
    competitionPlatform: null,
    competitionRegion: null,
    competitionTimeZone: browserTimeZone(),
    competitionFormat: null,
    competitionGameEdition: "",
    customCompetitionGameEdition: false,
    invitationToken: "",
    invitationPreview: null,
    gameAccountIdentifier: "",
    platform: null,
    gameEdition: "",
    customGameEdition: false,
    selectedExternalClub: null,
  };
}

export function competitionFromDraft(draft: OnboardingDraft): CompetitionDraftInputDto | null {
  const name = draft.competitionName.trim();
  const gameEdition = draft.competitionGameEdition.trim();
  const timeZone = draft.competitionTimeZone.trim();
  if (
    !name ||
    !gameEdition ||
    !draft.competitionPlatform ||
    !draft.competitionRegion ||
    !timeZone ||
    !draft.competitionFormat
  ) {
    return null;
  }
  return {
    name,
    gameEdition,
    platform: draft.competitionPlatform,
    region: draft.competitionRegion,
    timeZone,
    format: draft.competitionFormat,
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
