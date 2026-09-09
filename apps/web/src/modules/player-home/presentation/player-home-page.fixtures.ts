import type {
  AccessibleCompetitionDto,
  GetMyGameProfileResponse,
  GetMyNextEncounterResponse,
  GetMyPlayerProfileResponse,
  GetMyRecentMatchesResponse,
  ListAccessibleCompetitionsResponse,
  ListMyRosterInvitationsResponse,
  NextEncounterDto,
  PlayerRecentProviderMatchDto,
} from "@futrob/api-contracts";
import { recentProviderMatchFixture } from "@/modules/statistics/presentation/player-matches-page.fixtures.ts";
import { gameProfileReadyFixture } from "@/modules/statistics/presentation/player-profile/player-statistics-page.fixtures.ts";
import {
  playerGameAccountFixture,
  playerProfileFixture,
  rosterInvitationInboxItemFixture,
} from "@/modules/teams/presentation/player-story-fixtures.ts";

export const PLAYER_HOME_CLUB_ID = "725178";

const CUERVOS_CREST_URL =
  "https://eafc26.content.easports.com/fc/fltOnlineAssets/26E4D4D6-8DBB-4A9A-BD99-9C47D3AA341D/2026/fcweb/crests/256x256/l99160520.png";
const MADERAS_CREST_URL =
  "https://eafc26.content.easports.com/fc/fltOnlineAssets/26E4D4D6-8DBB-4A9A-BD99-9C47D3AA341D/2026/fcweb/crests/256x256/l99160222.png";

export function playerHomeClubAssociation(
  overrides: Partial<GetMyPlayerProfileResponse["externalClubs"][number]> = {},
) {
  return {
    playerProfileId: "profile-story",
    providerKey: "ea-clubs" as const,
    externalClubId: overrides.externalClubId ?? PLAYER_HOME_CLUB_ID,
    externalClubName: overrides.externalClubName ?? "Cuervos FC1",
    platform: overrides.platform ?? "playstation",
    gameEdition: overrides.gameEdition ?? "FC 26",
    imageUrl: overrides.imageUrl ?? CUERVOS_CREST_URL,
    associatedAt: overrides.associatedAt ?? "2026-08-01T00:00:00.000Z",
  };
}

export function playerHomeProfileFixture(input: {
  readonly linked: boolean;
  readonly club: boolean;
}): GetMyPlayerProfileResponse {
  return playerProfileFixture({
    gameAccounts: input.linked ? [playerGameAccountFixture()] : [],
    externalClubs: input.club ? [playerHomeClubAssociation()] : [],
  });
}

export function nextEncounterFixture(overrides: Partial<NextEncounterDto> = {}): NextEncounterDto {
  return {
    encounterId: overrides.encounterId ?? "encounter-liga-4",
    competition: overrides.competition ?? {
      id: "competition-liga",
      organizationId: "org-1",
      name: "Liga Futrob",
      timeZone: "America/Lima",
    },
    round: overrides.round ?? { number: 4, total: 10 },
    scheduledStartAt: overrides.scheduledStartAt ?? "2026-09-08T02:00:00.000Z",
    officialMatchCount: overrides.officialMatchCount ?? 1,
    home: overrides.home ?? {
      teamId: "team-cuervos",
      name: "Cuervos FC1",
      externalClub: {
        providerKey: "ea-clubs",
        externalClubId: PLAYER_HOME_CLUB_ID,
        name: "Cuervos FC1",
        platform: "common-gen5",
        gameEdition: "fc26",
        imageUrl: CUERVOS_CREST_URL,
      },
    },
    away: overrides.away ?? {
      teamId: "team-maderas",
      name: "MADERAS FC",
      externalClub: {
        providerKey: "ea-clubs",
        externalClubId: "club-maderas",
        name: "MADERAS FC",
        platform: "common-gen5",
        gameEdition: "fc26",
        imageUrl: MADERAS_CREST_URL,
      },
    },
  };
}

export function nextEncounterResponseFixture(
  encounter: NextEncounterDto | null = nextEncounterFixture(),
): GetMyNextEncounterResponse {
  return { encounter };
}

export function accessibleCompetitionFixture(
  overrides: Partial<AccessibleCompetitionDto["competition"]> = {},
): AccessibleCompetitionDto {
  return {
    role: "player",
    competition: {
      id: overrides.id ?? "competition-liga",
      organizationId: overrides.organizationId ?? "org-1",
      name: overrides.name ?? "Liga Futrob",
      status: overrides.status ?? "published",
      modality: "fc-clubs",
      gameEdition: overrides.gameEdition ?? "fc26",
      platform: overrides.platform ?? "playstation",
      region: overrides.region ?? "south-america",
      timeZone: overrides.timeZone ?? "America/Lima",
      format: overrides.format ?? "league",
      createdAt: overrides.createdAt ?? "2026-08-01T00:00:00.000Z",
      updatedAt: overrides.updatedAt ?? "2026-08-01T00:00:00.000Z",
    },
  };
}

export function copaFutrobFixture(): AccessibleCompetitionDto {
  return accessibleCompetitionFixture({
    id: "competition-copa",
    name: "Copa Futrob",
    format: "knockout",
    status: "draft",
  });
}

export function supercopaFutrobFixture(): AccessibleCompetitionDto {
  return accessibleCompetitionFixture({
    id: "competition-supercopa",
    name: "Supercopa Futrob",
    format: "knockout",
    status: "draft",
  });
}

export function competitionsMineFixture(
  competitions: readonly AccessibleCompetitionDto[] = [
    accessibleCompetitionFixture(),
    copaFutrobFixture(),
    supercopaFutrobFixture(),
  ],
): ListAccessibleCompetitionsResponse {
  return { competitions: [...competitions] };
}

export function lastHomeMatchFixture(): PlayerRecentProviderMatchDto {
  return recentProviderMatchFixture({
    occurredAt: "2026-09-07T04:42:00.000Z",
    home: {
      externalClubId: PLAYER_HOME_CLUB_ID,
      name: "Cuervos FC1",
      goals: 6,
      imageUrl: CUERVOS_CREST_URL,
    },
    away: {
      externalClubId: "club-maderas",
      name: "MADERAS FC",
      goals: 0,
      imageUrl: MADERAS_CREST_URL,
    },
    appearance: {
      goals: 0,
      assists: 1,
      rating: 10,
      isMvp: true,
      externalClubId: PLAYER_HOME_CLUB_ID,
    },
  });
}

export function recentMatchesSomeFixture(): Extract<
  GetMyRecentMatchesResponse,
  { status: "ready" }
> {
  return { status: "ready", matches: [lastHomeMatchFixture()] };
}

export function recentMatchesNoneFixture(): Extract<
  GetMyRecentMatchesResponse,
  { status: "ready" }
> {
  return { status: "ready", matches: [] };
}

export function gameProfileHomeFixture(): GetMyGameProfileResponse {
  return { status: "ready", profile: gameProfileReadyFixture() };
}

export function invitationsPendingFixture(): ListMyRosterInvitationsResponse {
  return { invitations: [rosterInvitationInboxItemFixture()] };
}

export function invitationsEmptyFixture(): ListMyRosterInvitationsResponse {
  return { invitations: [] };
}
