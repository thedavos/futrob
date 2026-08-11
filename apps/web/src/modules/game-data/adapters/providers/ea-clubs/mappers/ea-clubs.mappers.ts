import type { ExternalClub, ProviderMatch, ProviderPlayerMatchStats } from "@futrob/game-data";
import type {
  EaClubInfo,
  EaClubMatch,
  EaLeaderboardEntry,
} from "@/modules/game-data/adapters/providers/ea-clubs/schemas/ea-clubs.schemas.ts";
import {
  buildEaClubCrestUrl,
  crestAssetIdFromCustomKit,
} from "@/modules/game-data/adapters/providers/ea-clubs/mappers/build-ea-club-crest-url.ts";

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
): {
  home: { externalClubId: string; name: string; goals: number };
  away: { externalClubId: string; name: string; goals: number };
} | null {
  const ids = Object.keys(clubs);
  if (ids.length < 2) {
    return null;
  }

  const focal = clubs[focalClubId] ? focalClubId : ids[0]!;
  const other = ids.find((id) => id !== focal) ?? ids[1]!;
  const homeClub = clubs[focal]!;
  const awayClub = clubs[other]!;

  return {
    home: {
      externalClubId: focal,
      name: homeClub.details?.name ?? focal,
      goals: homeClub.goals ?? homeClub.score ?? 0,
    },
    away: {
      externalClubId: other,
      name: awayClub.details?.name ?? other,
      goals: awayClub.goals ?? awayClub.score ?? 0,
    },
  };
}

function optionalNumber(value: number | undefined): number | null {
  return value === undefined ? null : value;
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
        goals: optionalNumber(stats.goals),
        assists: optionalNumber(stats.assists),
        shots: optionalNumber(stats.shots),
        passAttempts: optionalNumber(stats.passattempts),
        passesMade: optionalNumber(stats.passesmade),
        tackleAttempts: optionalNumber(stats.tackleattempts),
        tacklesMade: optionalNumber(stats.tacklesmade),
        saves: optionalNumber(stats.saves),
        yellowCards: optionalNumber(stats.yellowcards),
        redCards: optionalNumber(stats.redcards),
        isMvp: mapIsMvp(stats.mom),
        rating: optionalNumber(stats.rating),
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
  const sides = pickHomeAway(match.clubs, input.focalExternalClubId);
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
