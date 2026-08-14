import type {
  ExternalClub,
  ProviderMatch,
  ProviderMatchTeam,
  ProviderPlayerMatchStats,
} from "@futrob/game-data";
import type { EaClubInfo, EaClubMatch, EaLeaderboardEntry, EaMatchClub } from "./schemas.ts";
import { buildEaClubCrestUrl, crestAssetIdFromCustomKit } from "./crest-url.ts";

export function mapLeaderboardEntryToExternalClub(
  entry: EaLeaderboardEntry,
  input: { readonly platform: string; readonly gameEdition: string },
): ExternalClub | null {
  const fromInfo = entry.clubInfo;
  const externalClubId = fromInfo?.clubId ?? entry.clubId;
  const name = fromInfo?.name ?? entry.clubName;
  if (!externalClubId || !name) {
    return null;
  }

  return {
    providerKey: "ea-clubs",
    externalClubId,
    name,
    platform: entry.platform ?? input.platform,
    gameEdition: input.gameEdition,
    imageUrl: buildEaClubCrestUrl(
      input.gameEdition,
      crestAssetIdFromCustomKit(fromInfo?.customKit),
    ),
  };
}

export function mapClubInfoToExternalClub(
  info: EaClubInfo,
  input: { readonly platform: string; readonly gameEdition: string },
): ExternalClub {
  return {
    providerKey: "ea-clubs",
    externalClubId: info.clubId,
    name: info.name,
    platform: input.platform,
    gameEdition: input.gameEdition,
    imageUrl: buildEaClubCrestUrl(input.gameEdition, crestAssetIdFromCustomKit(info.customKit)),
  };
}

function pickHomeAway(
  clubs: EaClubMatch["clubs"],
  focalClubId: string,
  gameEdition: string,
): { home: ProviderMatchTeam; away: ProviderMatchTeam } | null {
  const ids = Object.keys(clubs);
  if (ids.length < 2) {
    return null;
  }

  const focal = clubs[focalClubId] ? focalClubId : ids[0]!;
  const other = ids.find((id) => id !== focal) ?? ids[1]!;
  return {
    home: toMatchTeam(focal, clubs[focal]!, gameEdition),
    away: toMatchTeam(other, clubs[other]!, gameEdition),
  };
}

function toMatchTeam(
  externalClubId: string,
  club: EaMatchClub,
  gameEdition: string,
): ProviderMatchTeam {
  return {
    externalClubId,
    name: club.details?.name ?? externalClubId,
    goals: club.goals ?? club.score ?? 0,
    imageUrl: buildEaClubCrestUrl(
      gameEdition,
      crestAssetIdFromCustomKit(club.details?.customKit) ?? club.TEAM ?? null,
    ),
  };
}

function mapMinutesPlayed(stats: {
  readonly secondsPlayed?: number;
  readonly secondsplayed?: number;
}): number | null {
  const seconds = stats.secondsPlayed ?? stats.secondsplayed;
  if (seconds === undefined) {
    return null;
  }
  return Math.floor(seconds / 60);
}

function mapIsMvp(mom: number | undefined): boolean | null {
  if (mom === undefined) {
    return null;
  }
  return mom > 0;
}

function mapPosition(pos: string | number | undefined): string | null {
  if (pos === undefined) {
    return null;
  }
  return String(pos);
}

function mapPlayers(match: EaClubMatch): ProviderPlayerMatchStats[] {
  const players: ProviderPlayerMatchStats[] = [];
  const byClub = match.players ?? {};

  for (const [externalClubId, clubPlayers] of Object.entries(byClub)) {
    for (const [externalPlayerId, stats] of Object.entries(clubPlayers)) {
      players.push({
        externalPlayerId,
        displayName: stats.playername ?? externalPlayerId,
        externalClubId,
        position: mapPosition(stats.pos),
        minutesPlayed: mapMinutesPlayed(stats),
        goals: stats.goals ?? null,
        assists: stats.assists ?? null,
        shots: stats.shots ?? null,
        passAttempts: stats.passattempts ?? null,
        passesMade: stats.passesmade ?? null,
        tackleAttempts: stats.tackleattempts ?? null,
        tacklesMade: stats.tacklesmade ?? null,
        saves: stats.saves ?? null,
        yellowCards: stats.yellowcards ?? null,
        redCards: stats.redcards ?? null,
        isMvp: mapIsMvp(stats.mom),
        rating: stats.rating ?? null,
      });
    }
  }

  return players;
}

export function mapClubMatchToProviderMatch(
  match: EaClubMatch,
  input: {
    readonly platform: string;
    readonly gameEdition: string;
    readonly matchType: string;
    readonly focalExternalClubId: string;
  },
): ProviderMatch | null {
  const sides = pickHomeAway(match.clubs, input.focalExternalClubId, input.gameEdition);
  if (!sides) {
    return null;
  }

  const winnerByForfeit = Object.values(match.clubs).some((club) => (club.winnerByDnf ?? 0) > 0);

  return {
    id: `ea-clubs:${match.matchId}`,
    provider: {
      key: "ea-clubs",
      externalMatchId: match.matchId,
    },
    game: {
      edition: input.gameEdition,
      platform: input.platform,
      mode: input.matchType,
    },
    occurredAt: new Date(match.timestamp * 1000),
    home: sides.home,
    away: sides.away,
    players: mapPlayers(match),
    metadata: {
      durationSeconds: null,
      wasDisconnected: winnerByForfeit,
      winnerByForfeit,
      completeness: match.players ? "complete" : "partial",
    },
  };
}
