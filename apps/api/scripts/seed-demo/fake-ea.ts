/**
 * Deterministic stand-in for the EA Clubs API, limited to the demo clubs.
 *
 * The seed feeds it to `createModules` as `fetcher`, so provider sync jobs ingest these
 * matches through the real adapter. `fake-ea-server.ts` serves the same world over HTTP
 * so the local API can read "Mis partidos" and run syncs for demo clubs after seeding.
 */

/** Every demo club and match id starts with this prefix; reset relies on it. */
export const DEMO_EA_ID_PREFIX = "7770";

export type DemoMatchType = "leagueMatch" | "playoffMatch" | "friendlyMatch";

export interface DemoPlayerLine {
  readonly gamertag: string;
  readonly position: "goalkeeper" | "defender" | "midfielder" | "forward";
  readonly goals: number;
  readonly assists: number;
  readonly rating: number;
  readonly yellowCards: number;
  readonly redCards: number;
  readonly mom: boolean;
}

export interface DemoSide {
  readonly clubId: string;
  readonly goals: number;
  readonly players: readonly DemoPlayerLine[];
}

export interface DemoMatch {
  readonly matchId: string;
  readonly occurredAt: string;
  readonly matchType: DemoMatchType;
  readonly home: DemoSide;
  readonly away: DemoSide;
  /** EA flags a forfeit win when a side disconnects. */
  readonly disconnected?: boolean;
}

export interface DemoClub {
  readonly clubId: string;
  readonly name: string;
  /** Players EA lists for the club; Futrob correlates them by game account identifier. */
  readonly squad: readonly SquadMember[];
}

export interface SquadMember {
  readonly gamertag: string;
  readonly position: DemoPlayerLine["position"];
}

export interface DemoEaWorldSnapshot {
  readonly generatedAt: string;
  readonly clubs: readonly DemoClub[];
  readonly matches: readonly DemoMatch[];
}

/** mulberry32: small seeded PRNG so every seed run produces the same data. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class DemoEaWorld {
  private readonly clubs = new Map<string, DemoClub>();
  private readonly matches: DemoMatch[] = [];
  private matchSequence = 0;
  private readonly random: () => number;

  constructor(seed = 2026) {
    this.random = seededRandom(seed);
  }

  static fromSnapshot(snapshot: DemoEaWorldSnapshot): DemoEaWorld {
    const world = new DemoEaWorld();
    for (const club of snapshot.clubs) world.clubs.set(club.clubId, club);
    world.matches.push(...snapshot.matches);
    world.matchSequence = snapshot.matches.length;
    return world;
  }

  snapshot(now: Date): DemoEaWorldSnapshot {
    return {
      generatedAt: now.toISOString(),
      clubs: [...this.clubs.values()],
      matches: [...this.matches],
    };
  }

  addClub(input: {
    readonly number: number;
    readonly name: string;
    squad: readonly SquadMember[];
  }) {
    const clubId = `${DEMO_EA_ID_PREFIX}${String(input.number).padStart(3, "0")}`;
    const club: DemoClub = { clubId, name: input.name, squad: input.squad };
    this.clubs.set(clubId, club);
    return club;
  }

  club(clubId: string): DemoClub {
    const club = this.clubs.get(clubId);
    if (!club) throw new Error(`Unknown demo club ${clubId}`);
    return club;
  }

  /**
   * Adds a match with a plausible box score. `homeGoals`/`awayGoals` fix the score;
   * `scorers` forces goals to named gamertags (hat-tricks, a personal-space story).
   */
  addMatch(input: {
    readonly homeClubId: string;
    readonly awayClubId: string;
    readonly occurredAt: Date;
    readonly homeGoals: number;
    readonly awayGoals: number;
    readonly matchType?: DemoMatchType;
    readonly scorers?: Readonly<Record<string, number>>;
    readonly absent?: readonly string[];
    readonly cards?: Readonly<Record<string, { yellow?: number; red?: number }>>;
    readonly disconnected?: boolean;
  }): DemoMatch {
    this.matchSequence += 1;
    const matchId = `${DEMO_EA_ID_PREFIX}00${String(this.matchSequence).padStart(9, "0")}`;
    const absent = new Set(input.absent ?? []);
    const [home, away] = withMvp(
      this.side(input.homeClubId, input.homeGoals, input, absent),
      this.side(input.awayClubId, input.awayGoals, input, absent),
    );
    const match: DemoMatch = {
      matchId,
      occurredAt: input.occurredAt.toISOString(),
      matchType: input.matchType ?? "leagueMatch",
      home,
      away,
      disconnected: input.disconnected,
    };
    this.matches.push(match);
    return match;
  }

  private side(
    clubId: string,
    goals: number,
    input: {
      readonly scorers?: Readonly<Record<string, number>>;
      readonly cards?: Readonly<Record<string, { yellow?: number; red?: number }>>;
    },
    absent: ReadonlySet<string>,
  ): DemoSide {
    const club = this.club(clubId);
    const squad = club.squad.filter((member) => !absent.has(member.gamertag));
    const goalsBy = new Map<string, number>();
    let remaining = goals;
    for (const member of squad) {
      const forced = input.scorers?.[member.gamertag];
      if (forced === undefined) continue;
      const scored = Math.min(forced, remaining);
      goalsBy.set(member.gamertag, scored);
      remaining -= scored;
    }
    const outfield = squad.filter(
      (member) =>
        member.position !== "goalkeeper" && input.scorers?.[member.gamertag] === undefined,
    );
    while (remaining > 0 && outfield.length > 0) {
      // Forwards score more often than defenders.
      const weighted = outfield.flatMap((member) =>
        member.position === "forward"
          ? [member, member, member]
          : member.position === "midfielder"
            ? [member, member]
            : [member],
      );
      const scorer = weighted[Math.floor(this.random() * weighted.length)]!;
      goalsBy.set(scorer.gamertag, (goalsBy.get(scorer.gamertag) ?? 0) + 1);
      remaining -= 1;
    }
    const assistsBy = new Map<string, number>();
    for (let index = 0; index < goals; index += 1) {
      if (this.random() < 0.3 || outfield.length === 0) continue;
      const assister = outfield[Math.floor(this.random() * outfield.length)]!;
      assistsBy.set(assister.gamertag, (assistsBy.get(assister.gamertag) ?? 0) + 1);
    }
    const lines = squad.map((member) => {
      const scored = goalsBy.get(member.gamertag) ?? 0;
      const assists = assistsBy.get(member.gamertag) ?? 0;
      const forcedCards = input.cards?.[member.gamertag];
      const yellow = forcedCards?.yellow ?? (this.random() < 0.12 ? 1 : 0);
      const red = forcedCards?.red ?? 0;
      const rating = Math.min(
        10,
        Math.round((5.8 + this.random() * 2.2 + scored * 0.7 + assists * 0.4 - red * 1.5) * 10) /
          10,
      );
      return {
        gamertag: member.gamertag,
        position: member.position,
        goals: scored,
        assists,
        rating,
        yellowCards: yellow,
        redCards: red,
        mom: false,
      } satisfies DemoPlayerLine;
    });
    return { clubId, goals, players: lines };
  }

  /**
   * A `fetch` for the EA Clubs endpoints the adapter calls. Requests for clubs outside
   * the demo world go to `fallback` (the real EA) when given, and answer 404 otherwise.
   */
  fetcher(fallback?: typeof fetch): typeof fetch {
    return async (input, init) => {
      const url = new URL(new Request(input).url);
      const params = url.searchParams;
      const delegate = () =>
        fallback ? fallback(input, init) : Promise.resolve(Response.json({}, { status: 404 }));

      if (url.pathname.endsWith("/clubs/matches")) {
        const clubId = params.get("clubIds") ?? "";
        if (!this.clubs.has(clubId)) return delegate();
        return Response.json(this.matchesPayload(clubId, params));
      }
      if (url.pathname.endsWith("/clubs/info")) {
        const clubId = params.get("clubIds") ?? "";
        const club = this.clubs.get(clubId);
        if (!club) return delegate();
        return Response.json({ [clubId]: clubInfo(club) });
      }
      if (url.pathname.endsWith("/allTimeLeaderboard/search")) {
        const query = (params.get("clubName") ?? "").trim().toLowerCase();
        const found = [...this.clubs.values()].filter((club) =>
          club.name.toLowerCase().includes(query),
        );
        if (found.length === 0) return delegate();
        return Response.json(
          found.map((club) => ({
            clubId: club.clubId,
            clubName: club.name,
            platform: params.get("platform") ?? "common-gen5",
            clubInfo: clubInfo(club),
          })),
        );
      }
      return delegate();
    };
  }

  private matchesPayload(clubId: string, params: URLSearchParams): unknown[] {
    const matchType = params.get("matchType");
    const max = Number(params.get("maxResultCount") ?? "50");
    const now = Date.now();
    return this.matches
      .filter((match) => match.home.clubId === clubId || match.away.clubId === clubId)
      .filter((match) => !matchType || match.matchType === matchType)
      .filter((match) => Date.parse(match.occurredAt) <= now)
      .sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt))
      .slice(0, Number.isFinite(max) && max > 0 ? max : 50)
      .map((match) => this.eaPayload(match, now));
  }

  private eaPayload(match: DemoMatch, now: number) {
    const timestamp = Math.floor(Date.parse(match.occurredAt) / 1000);
    const days = Math.max(0, Math.floor((now / 1000 - timestamp) / 86_400));
    const clubPayload = (side: DemoSide, rival: DemoSide) => {
      const club = this.club(side.clubId);
      const won = side.goals > rival.goals;
      const tied = side.goals === rival.goals;
      return {
        date: String(timestamp),
        gameNumber: "0",
        goals: String(side.goals),
        goalsAgainst: String(rival.goals),
        score: String(side.goals),
        result: won ? "1" : tied ? "4" : "2",
        wins: won ? "1" : "0",
        losses: !won && !tied ? "1" : "0",
        ties: tied ? "1" : "0",
        winnerByDnf: match.disconnected && won ? "1" : "0",
        matchType: match.matchType === "playoffMatch" ? "1" : "5",
        season_id: "0",
        details: {
          name: club.name,
          clubId: Number(club.clubId),
          regionId: 5456205,
          teamId: 131_000 + Number(club.clubId.slice(-3)),
        },
      };
    };
    const playersPayload = (side: DemoSide) =>
      Object.fromEntries(
        side.players.map((line) => [
          line.gamertag,
          {
            playername: line.gamertag,
            pos: line.position,
            goals: String(line.goals),
            assists: String(line.assists),
            rating: line.rating.toFixed(2),
            shots: String(line.goals + Math.floor(line.rating / 3)),
            passattempts: String(18 + Math.round(line.rating * 2)),
            passesmade: String(14 + Math.round(line.rating * 1.6)),
            tackleattempts: String(line.position === "forward" ? 3 : 9),
            tacklesmade: String(line.position === "forward" ? 1 : 5),
            saves: String(line.position === "goalkeeper" ? 3 : 0),
            yellowcards: String(line.yellowCards),
            redcards: String(line.redCards),
            mom: line.mom ? "1" : "0",
            secondsPlayed: String(line.redCards > 0 ? 3600 : 5400),
          },
        ]),
      );
    return {
      matchId: match.matchId,
      timestamp,
      timeAgo: days > 0 ? { number: days, unit: "days" } : { number: 1, unit: "hours" },
      clubs: {
        [match.home.clubId]: clubPayload(match.home, match.away),
        [match.away.clubId]: clubPayload(match.away, match.home),
      },
      players: {
        [match.home.clubId]: playersPayload(match.home),
        [match.away.clubId]: playersPayload(match.away),
      },
      aggregate: {},
    };
  }
}

/** The best rating of the match is the man of the match. */
function withMvp(home: DemoSide, away: DemoSide): [DemoSide, DemoSide] {
  const all = [...home.players, ...away.players];
  if (all.length === 0) return [home, away];
  const best = all.reduce((top, line) => (line.rating > top.rating ? line : top));
  const mark = (side: DemoSide): DemoSide => ({
    ...side,
    players: side.players.map((line) => (line === best ? { ...line, mom: true } : line)),
  });
  return [mark(home), mark(away)];
}

function clubInfo(club: DemoClub) {
  return {
    name: club.name,
    clubId: Number(club.clubId),
    regionId: 5456205,
    teamId: 131_000 + Number(club.clubId.slice(-3)),
  };
}
