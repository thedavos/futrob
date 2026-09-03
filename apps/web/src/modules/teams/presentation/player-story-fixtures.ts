import type {
  GetMyPlayerProfileResponse,
  GetMyTeamsResponse,
  PlayerGameAccountDto,
  PlayerTeamMembershipDto,
} from "@futrob/api-contracts";

const CREATED_AT = "2026-08-01T00:00:00.000Z";
const PROFILE_ID = "profile-story";

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
  });
}
