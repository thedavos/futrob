import type {
  GetMyPlayerProfileResponse,
  PlayerGameProfileDto,
  PlayerRecentProviderMatchDto,
  RosterInvitationInboxItemDto,
} from "@futrob/api-contracts";
import type { PlayerHomeSnapshot } from "./player-home-model";

const date = "2026-09-01T00:00:00.000Z";

export const profile: GetMyPlayerProfileResponse = {
  profile: { id: "profile-1", createdAt: date },
  gameAccounts: [
    {
      id: "account-1",
      playerProfileId: "profile-1",
      identifier: "davos282",
      providerExternalPlayerId: null,
      platform: "playstation",
      gameEdition: "fc26",
      createdAt: date,
    },
  ],
  externalClubs: ["cuervos", "maderas"].map((name) => ({
    playerProfileId: "profile-1",
    providerKey: "ea-clubs",
    externalClubId: `club-${name}`,
    externalClubName: name === "cuervos" ? "Cuervos FC1" : "MADERAS FC",
    platform: "common-gen5",
    gameEdition: "fc26",
    imageUrl: null,
    associatedAt: date,
  })),
};

export const lastMatch: PlayerRecentProviderMatchDto = {
  kind: "played",
  listedExternalClubId: "club-cuervos",
  listedMvpDisplayName: "davos282",
  appearance: {
    externalPlayerId: "davos282",
    displayName: "davos282",
    externalClubId: "club-cuervos",
    position: "ST",
    minutesPlayed: 12,
    goals: 0,
    assists: 1,
    shots: 2,
    passAttempts: 6,
    passesMade: 4,
    tackleAttempts: 0,
    tacklesMade: 0,
    saves: null,
    yellowCards: 0,
    redCards: 0,
    isMvp: true,
    rating: 10,
  },
  match: {
    id: "match-1",
    provider: { key: "ea-clubs", externalMatchId: "ea-1" },
    game: { edition: "fc26", platform: "common-gen5", mode: "leagueMatch" },
    occurredAt: "2026-09-06T04:42:00.000Z",
    home: { externalClubId: "club-cuervos", name: "Cuervos FC1", goals: 6, imageUrl: null },
    away: { externalClubId: "club-maderas", name: "MADERAS FC", goals: 0, imageUrl: null },
    metadata: {
      durationSeconds: 540,
      wasDisconnected: false,
      winnerByForfeit: false,
      completeness: "complete",
    },
  },
};

const totals = {
  goals: 0,
  assists: 1,
  shots: 2,
  passAttempts: 6,
  passesMade: 4,
  tackleAttempts: 0,
  tacklesMade: 0,
  saves: 0,
  yellowCards: 0,
  redCards: 0,
  mvpAwards: 1,
  rating: 10,
};

export const gameProfile: PlayerGameProfileDto = {
  identity: { displayName: "davos282", preferredPosition: "ST", preferredRole: "attack" },
  sampleSize: 1,
  attributes: [],
  evolution: [{ occurredAt: lastMatch.match.occurredAt, rating: 10, outcome: "win" }],
  summary: {
    matchesPlayed: 1,
    wins: 1,
    draws: 0,
    losses: 0,
    minutes: 12,
    totals,
    averages: { ...totals, saves: null },
    partial: {
      minutes: false,
      goals: false,
      assists: false,
      shots: false,
      passAttempts: false,
      passesMade: false,
      tackleAttempts: false,
      tacklesMade: false,
      saves: true,
      yellowCards: false,
      redCards: false,
      mvpAwards: false,
      rating: false,
    },
  },
  byTeam: [],
  byPosition: [],
};

export function invitation(
  invitationId: string,
  status: RosterInvitationInboxItemDto["status"],
): RosterInvitationInboxItemDto {
  return {
    invitationId,
    organizationId: "org-1",
    competitionId: "competition-liga",
    teamId: "team-cuervos",
    teamName: "Cuervos FC1",
    clubName: "Cuervos FC1",
    crestUrl: null,
    role: "player",
    status,
    invitedBy: { displayName: "Ana", gamertag: "ana", role: "captain" },
    recipientIdentifier: "davos282",
    message: null,
    createdAt: date,
    expiresAt: "2026-10-02T00:00:00.000Z",
    respondedAt: status === "pending" ? null : date,
  };
}

export function snapshot(overrides: Partial<PlayerHomeSnapshot> = {}): PlayerHomeSnapshot {
  return {
    externalClubId: "club-cuervos",
    profile: { kind: "ready", data: profile },
    recentMatches: { kind: "ready", data: { status: "ready", matches: [lastMatch] } },
    gameProfile: { kind: "ready", data: { status: "ready", profile: gameProfile } },
    competitions: {
      kind: "ready",
      data: {
        competitions: [
          {
            role: "player",
            competition: {
              id: "competition-liga",
              organizationId: "org-1",
              name: "Liga Futrob",
              status: "published",
              modality: "fc-clubs",
              gameEdition: "fc26",
              platform: "playstation",
              region: "south-america",
              timeZone: "America/Lima",
              format: "league",
              teams: { min: 2, max: null },
              schedule: { startsOn: null, endsOn: null },
              cover: { kind: "preset", preset: "cup" },
              createdAt: date,
              updatedAt: date,
            },
          },
        ],
      },
    },
    nextEncounter: {
      kind: "ready",
      data: {
        encounter: {
          encounterId: "encounter-1",
          competition: {
            id: "competition-liga",
            organizationId: "org-1",
            name: "Liga Futrob",
            timeZone: "America/Lima",
          },
          round: { number: 4, total: 10 },
          scheduledStartAt: "2026-10-02T02:00:00.000Z",
          officialMatchCount: 1,
          home: { teamId: "team-cuervos", name: "Cuervos FC1", externalClub: null },
          away: { teamId: "team-maderas", name: "MADERAS FC", externalClub: null },
        },
      },
    },
    invitations: {
      kind: "ready",
      data: {
        invitations: [invitation("invite-1", "pending"), invitation("invite-2", "accepted")],
      },
    },
    ...overrides,
  };
}
