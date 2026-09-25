import type {
  GetMyPlayerProfileResponse,
  GetMyTeamsResponse,
  ListMyRosterInvitationsResponse,
  PlayerExternalClubAssociationDto,
  PlayerGameAccountDto,
  PlayerTeamMembershipDto,
  RosterInvitationInboxItemDto,
} from "@futrob/api-contracts";
import { daysFromNowIso } from "@futrob/shared-kernel";

const CREATED_AT = "2026-08-01T00:00:00.000Z";
const PROFILE_ID = "profile-story";
const FC26_CREST = (assetId: string) =>
  `https://eafc26.content.easports.com/fc/fltOnlineAssets/26E4D4D6-8DBB-4A9A-BD99-9C47D3AA341D/2026/fcweb/crests/256x256/l${assetId}.png`;

export function playerGameAccountFixture(
  overrides: Partial<PlayerGameAccountDto> = {},
): PlayerGameAccountDto {
  return {
    id: overrides.id ?? "account-davos282",
    playerProfileId: overrides.playerProfileId ?? PROFILE_ID,
    identifier: overrides.identifier ?? "davos282",
    providerExternalPlayerId: overrides.providerExternalPlayerId ?? null,
    platform: overrides.platform ?? "playstation",
    gameEdition: overrides.gameEdition ?? "FC 26",
    createdAt: overrides.createdAt ?? CREATED_AT,
  };
}

export function playerExternalClubFixture(
  overrides: Partial<PlayerExternalClubAssociationDto> = {},
): PlayerExternalClubAssociationDto {
  return {
    playerProfileId: overrides.playerProfileId ?? PROFILE_ID,
    providerKey: overrides.providerKey ?? "ea-clubs",
    externalClubId: overrides.externalClubId ?? "10754",
    externalClubName: overrides.externalClubName ?? "Night Owls",
    platform: overrides.platform ?? "common-gen5",
    gameEdition: overrides.gameEdition ?? "fc26",
    imageUrl: overrides.imageUrl === undefined ? null : overrides.imageUrl,
    associatedAt: overrides.associatedAt ?? CREATED_AT,
  };
}

export function playerProfileFixture(
  overrides: Partial<GetMyPlayerProfileResponse> = {},
): GetMyPlayerProfileResponse {
  return {
    profile: overrides.profile ?? { id: PROFILE_ID, createdAt: CREATED_AT },
    gameAccounts: overrides.gameAccounts ?? [],
    externalClubs: overrides.externalClubs ?? [],
  };
}

export function playerTeamMembershipFixture(
  overrides: {
    readonly active?: boolean;
    readonly team?: Partial<PlayerTeamMembershipDto["team"]>;
    readonly membership?: Partial<PlayerTeamMembershipDto["membership"]>;
  } = {},
): PlayerTeamMembershipDto {
  const teamId = overrides.team?.id ?? "team-fera";
  const organizationId = overrides.team?.organizationId ?? "org-liga-nocturna";
  const membershipId = overrides.membership?.id ?? "membership-fera";
  return {
    active: overrides.active ?? true,
    team: {
      id: teamId,
      organizationId,
      name: overrides.team?.name ?? "Fera Enjaulada",
      createdAt: overrides.team?.createdAt ?? CREATED_AT,
    },
    membership: {
      id: membershipId,
      organizationId: overrides.membership?.organizationId ?? organizationId,
      competitionId: overrides.membership?.competitionId ?? "copa-invierno",
      teamId: overrides.membership?.teamId ?? teamId,
      playerProfileId: overrides.membership?.playerProfileId ?? PROFILE_ID,
      gameAccountId: overrides.membership?.gameAccountId ?? null,
      role: overrides.membership?.role ?? "player",
      createdAt: overrides.membership?.createdAt ?? CREATED_AT,
    },
  };
}

export function playerTeamsFixture(
  overrides: Partial<GetMyTeamsResponse> = {},
): GetMyTeamsResponse {
  const teams = overrides.teams ?? [
    playerTeamMembershipFixture(),
    playerTeamMembershipFixture({
      active: false,
      team: { id: "team-cuervos", name: "Cuervos FC" },
      membership: {
        id: "membership-cuervos",
        competitionId: "liga-nocturna",
        teamId: "team-cuervos",
        role: "captain",
      },
    }),
  ];
  return {
    teams,
    activeRosterMembershipId:
      overrides.activeRosterMembershipId === undefined
        ? (teams.find((item) => item.active)?.membership.id ?? null)
        : overrides.activeRosterMembershipId,
  };
}

export function rosterInvitationInboxItemFixture(
  overrides: Partial<RosterInvitationInboxItemDto> = {},
): RosterInvitationInboxItemDto {
  return {
    invitationId: overrides.invitationId ?? "invitation-sirius",
    organizationId: overrides.organizationId ?? "org-liga-nocturna",
    competitionId: overrides.competitionId ?? "copa-invierno",
    teamId: overrides.teamId ?? "team-sirius",
    teamName: overrides.teamName ?? "Sirius FC",
    clubName: overrides.clubName ?? "Sirius FC",
    crestUrl: overrides.crestUrl ?? null,
    role: overrides.role ?? "player",
    status: overrides.status ?? "pending",
    invitedBy: overrides.invitedBy ?? {
      displayName: "Alex Rojas",
      gamertag: "alexrojas09",
      role: "captain",
    },
    recipientIdentifier: overrides.recipientIdentifier ?? "davos282",
    message:
      overrides.message === undefined
        ? "Nos gustaría contar contigo en el equipo para la próxima temporada."
        : overrides.message,
    createdAt: overrides.createdAt ?? daysFromNowIso(0),
    expiresAt: overrides.expiresAt ?? daysFromNowIso(6),
    respondedAt: overrides.respondedAt ?? null,
  };
}

export function playerRosterInvitationsFixture(
  invitations?: readonly RosterInvitationInboxItemDto[],
): ListMyRosterInvitationsResponse {
  return {
    invitations: [...(invitations ?? [rosterInvitationInboxItemFixture()])],
  };
}

export function readyPlayerProfileFixture(): GetMyPlayerProfileResponse {
  return playerProfileFixture({
    gameAccounts: [
      playerGameAccountFixture(),
      playerGameAccountFixture({
        id: "account-pc",
        identifier: "davos.pc",
        platform: "pc",
        gameEdition: "FC 26",
      }),
    ],
    externalClubs: [
      playerExternalClubFixture({
        imageUrl: FC26_CREST("99160122"),
      }),
      playerExternalClubFixture({
        externalClubId: "22110",
        externalClubName: "Fera Enjaulada",
        platform: "ps5",
        imageUrl: FC26_CREST("99160222"),
      }),
      playerExternalClubFixture({
        externalClubId: "725178",
        externalClubName: "Cuervos FC1",
        platform: "xbox",
        imageUrl: FC26_CREST("99160520"),
      }),
      playerExternalClubFixture({
        externalClubId: "44001",
        externalClubName: "MADERAS FC",
        platform: "nx",
        imageUrl: FC26_CREST("99160122"),
      }),
      playerExternalClubFixture({
        externalClubId: "33021",
        externalClubName: "Fera Barranco",
        platform: "ps5",
      }),
      playerExternalClubFixture({
        externalClubId: "88012",
        externalClubName: "Sirius FC",
        platform: "xbox",
      }),
      playerExternalClubFixture({
        externalClubId: "55003",
        externalClubName: "Atlas Nocturno",
      }),
    ],
  });
}
