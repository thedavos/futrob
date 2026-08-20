import type {
  GetMyRecentMatchesResponse,
  PlayerRecentProviderMatchDetailDto,
  PlayerRecentProviderMatchDto,
} from "@futrob/api-contracts";

const FC26_CREST =
  "https://eafc26.content.easports.com/fc/fltOnlineAssets/26E4D4D6-8DBB-4A9A-BD99-9C47D3AA341D/2026/fcweb/crests/256x256/l99160122.png";

/** Frozen "now" for Mis partidos stories and page tests (14 Aug 2026, local). */
export const PLAYER_MATCHES_PAGE_NOW = new Date(2026, 7, 14, 15, 0, 0);

type PlayedMatch = Extract<PlayerRecentProviderMatchDto, { kind: "played" }>;
type NotPlayedMatch = Extract<PlayerRecentProviderMatchDto, { kind: "not_played" }>;
type PlayedDetail = Extract<PlayerRecentProviderMatchDetailDto, { kind: "played" }>;
type NotPlayedDetail = Extract<PlayerRecentProviderMatchDetailDto, { kind: "not_played" }>;

type FixtureMatchFields = {
  readonly id: string;
  readonly externalMatchId: string;
  readonly occurredAt: string;
  readonly home: PlayedMatch["match"]["home"];
  readonly away: PlayedMatch["match"]["away"];
  readonly mode: PlayedMatch["match"]["game"]["mode"];
  readonly metadata: Partial<PlayedMatch["match"]["metadata"]>;
};

type PlayedFixtureOverrides = Partial<
  FixtureMatchFields & {
    readonly kind: "played";
    readonly appearance: Partial<PlayedMatch["appearance"]>;
    readonly listedExternalClubId: string;
    readonly listedMvpDisplayName: string | null;
  }
>;

type NotPlayedFixtureOverrides = Partial<FixtureMatchFields> & {
  readonly kind: "not_played";
  readonly listedExternalClubId?: string;
  readonly listedMvpDisplayName?: string | null;
};

type PlayedDetailOverrides = PlayedFixtureOverrides & {
  readonly players?: PlayedDetail["match"]["players"];
};

type NotPlayedDetailOverrides = NotPlayedFixtureOverrides & {
  readonly players?: PlayedDetail["match"]["players"];
};

export function recentProviderMatchFixture(overrides?: PlayedFixtureOverrides): PlayedMatch;
export function recentProviderMatchFixture(overrides: NotPlayedFixtureOverrides): NotPlayedMatch;
export function recentProviderMatchFixture(
  overrides: PlayedFixtureOverrides | NotPlayedFixtureOverrides = {},
): PlayerRecentProviderMatchDto {
  const home = overrides.home ?? {
    externalClubId: "10754",
    name: "Fera Enjaulada",
    goals: 2,
    imageUrl: FC26_CREST,
  };

  const match = {
    id: overrides.id ?? "provider-match-1",
    provider: { key: "ea-clubs" as const, externalMatchId: overrides.externalMatchId ?? "ea-1" },
    game: { edition: "fc26", platform: "common-gen5", mode: overrides.mode ?? "leagueMatch" },
    occurredAt: overrides.occurredAt ?? new Date(2026, 7, 14, 18, 0).toISOString(),
    home,
    away: overrides.away ?? {
      externalClubId: "99",
      name: "Night Owls",
      goals: 1,
      imageUrl: null,
    },
    metadata: {
      durationSeconds: 540,
      wasDisconnected: false,
      winnerByForfeit: false,
      completeness: "complete" as const,
      ...overrides.metadata,
    },
  };

  const kind = overrides.kind ?? "played";
  switch (kind) {
    case "played": {
      const appearanceOverrides = "appearance" in overrides ? overrides.appearance : undefined;
      const appearance = {
        externalPlayerId: "davos282",
        displayName: "davos282",
        externalClubId: home.externalClubId,
        position: "ST",
        minutesPlayed: 12,
        goals: 1,
        assists: 0,
        shots: 3,
        passAttempts: 8,
        passesMade: 6,
        tackleAttempts: 1,
        tacklesMade: 1,
        saves: null,
        yellowCards: 0,
        redCards: 0,
        isMvp: false,
        rating: 8.4,
        ...appearanceOverrides,
      };
      const listedExternalClubId =
        "listedExternalClubId" in overrides && overrides.listedExternalClubId !== undefined
          ? overrides.listedExternalClubId
          : appearance.externalClubId;
      return {
        kind: "played",
        match,
        appearance,
        listedExternalClubId,
        listedMvpDisplayName:
          "listedMvpDisplayName" in overrides && overrides.listedMvpDisplayName !== undefined
            ? overrides.listedMvpDisplayName
            : appearance.isMvp === true
              ? appearance.displayName
              : null,
      };
    }
    case "not_played":
      return {
        kind: "not_played",
        match,
        listedExternalClubId:
          "listedExternalClubId" in overrides && overrides.listedExternalClubId !== undefined
            ? overrides.listedExternalClubId
            : home.externalClubId,
        listedMvpDisplayName:
          "listedMvpDisplayName" in overrides && overrides.listedMvpDisplayName !== undefined
            ? overrides.listedMvpDisplayName
            : null,
      };
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function recentProviderMatchDetailFixture(overrides?: PlayedDetailOverrides): PlayedDetail;
export function recentProviderMatchDetailFixture(
  overrides: NotPlayedDetailOverrides,
): NotPlayedDetail;
export function recentProviderMatchDetailFixture(
  overrides: PlayedDetailOverrides | NotPlayedDetailOverrides = {},
): PlayerRecentProviderMatchDetailDto {
  const { players = [], ...listOverrides } = overrides;
  if (listOverrides.kind === "not_played") {
    return withRoster(recentProviderMatchFixture(listOverrides), players);
  }
  return withRoster(recentProviderMatchFixture(listOverrides), players);
}

function withRoster(
  row: PlayerRecentProviderMatchDto,
  players: PlayedDetail["match"]["players"],
): PlayerRecentProviderMatchDetailDto {
  switch (row.kind) {
    case "played": {
      const { listedMvpDisplayName: _listedMvpDisplayName, ...rest } = row;
      return { ...rest, match: { ...rest.match, players } };
    }
    case "not_played": {
      const { listedMvpDisplayName: _listedMvpDisplayName, ...rest } = row;
      return { ...rest, match: { ...rest.match, players } };
    }
    default: {
      const exhaustive: never = row;
      return exhaustive;
    }
  }
}

export function recentMatchesReadyFixture(
  matches: readonly PlayerRecentProviderMatchDto[] = [
    recentProviderMatchFixture({
      home: {
        externalClubId: "10754",
        name: "Fera Enjaulada",
        goals: 3,
        imageUrl: FC26_CREST,
      },
      appearance: { isMvp: true, goals: 3, assists: 0, rating: 8.4, yellowCards: 1, redCards: 0 },
    }),
    recentProviderMatchFixture({
      id: "provider-match-yesterday",
      externalMatchId: "ea-yesterday",
      mode: "playoffMatch",
      occurredAt: new Date(2026, 7, 13, 20, 0).toISOString(),
      home: { externalClubId: "22110", name: "Cuervos FC", goals: 0, imageUrl: null },
      away: { externalClubId: "33021", name: "Fera Barranco", goals: 3, imageUrl: null },
      appearance: {
        goals: 0,
        assists: 1,
        rating: 6.8,
        displayName: "davos282",
        yellowCards: 2,
        redCards: 1,
      },
    }),
    recentProviderMatchFixture({
      id: "provider-match-older",
      externalMatchId: "ea-older",
      mode: "friendlyMatch",
      occurredAt: new Date(2026, 7, 1, 18, 0).toISOString(),
      home: { externalClubId: "44001", name: "Atlético Norte", goals: 1, imageUrl: null },
      away: { externalClubId: "10754", name: "Fera Enjaulada", goals: 1, imageUrl: null },
      appearance: { externalClubId: "10754", goals: 0, assists: 0, rating: 7, isMvp: false },
    }),
  ],
): Extract<GetMyRecentMatchesResponse, { status: "ready" }> {
  return { status: "ready", matches: [...matches] };
}
