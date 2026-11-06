import { Panic, type TeamId } from "@futrob/shared-kernel";
import type { FixtureEncounter } from "../entities/fixture-plan.ts";
import { swissByeTeam } from "./swiss-standing-points.ts";

export interface PairSwissRoundInput {
  /** Registration order; the final tie-break when points are equal. */
  readonly seed: readonly TeamId[];
  readonly withdrawnTeamIds: readonly TeamId[];
  /** Pairing points including byes. A Team without an entry has none. */
  readonly points: ReadonlyMap<TeamId, number>;
  /** Every encounter already paired in the plan; closed ones count as met. */
  readonly encounters: readonly FixtureEncounter[];
}

export interface SwissTable {
  readonly home: TeamId;
  /** Null on the bye table, which is always the last one. */
  readonly away: TeamId | null;
}

export type SwissPairing =
  | { readonly kind: "paired"; readonly tables: readonly SwissTable[] }
  | { readonly kind: "exhausted" };

/** Default number of rounds for `teamCount` Teams: ⌈log₂ n⌉. */
export function defaultSwissRoundCount(teamCount: number): number {
  return Math.ceil(Math.log2(teamCount));
}

/** Most rounds Dirac's theorem keeps pairable while nobody withdraws: ⌊(n + 1) / 2⌋. */
export function maxSwissRoundCount(teamCount: number): number {
  return Math.floor((teamCount + 1) / 2);
}

/**
 * Score groups searched exhaustively (ADR-0027, section 2). Deterministic, and never a rematch:
 * when no complete pairing exists the phase ends instead.
 */
export function pairSwissRound(input: PairSwissRoundInput): SwissPairing {
  const withdrawn = new Set(input.withdrawnTeamIds);
  const seedOrder = new Map(input.seed.map((teamId, index) => [teamId, index]));
  const pointsOf = (teamId: TeamId) => input.points.get(teamId) ?? 0;
  const ranked = input.seed
    .filter((teamId) => !withdrawn.has(teamId))
    .sort(
      (left, right) =>
        pointsOf(right) - pointsOf(left) ||
        (seedOrder.get(left) ?? 0) - (seedOrder.get(right) ?? 0),
    );
  if (ranked.length < 2) return { kind: "exhausted" };

  const history = pairingHistory(input.encounters);
  const canMeet = ranked.map((teamId, index) =>
    ranked.map(
      (other, otherIndex) => index !== otherIndex && !history.met.get(teamId)?.has(other),
    ),
  );
  const points = ranked.map(pointsOf);

  const bottomUp = [...ranked.keys()].reverse();
  const byeCandidates =
    ranked.length % 2 === 0
      ? [null]
      : [
          ...bottomUp.filter((index) => !history.byes.has(ranked[index] as TeamId)),
          ...bottomUp.filter((index) => history.byes.has(ranked[index] as TeamId)),
        ];

  for (const bye of byeCandidates) {
    const unpaired = [...ranked.keys()].filter((index) => index !== bye);
    const pairs = searchPairs(unpaired, canMeet, points);
    if (!pairs) continue;
    const tables = pairs.map(([top, rival]) => {
      const better = ranked[top] as TeamId;
      const worse = ranked[rival] as TeamId;
      return history.homeGames(worse) < history.homeGames(better)
        ? { home: worse, away: better }
        : { home: better, away: worse };
    });
    return {
      kind: "paired",
      tables: bye === null ? tables : [...tables, { home: ranked[bye] as TeamId, away: null }],
    };
  }
  return { kind: "exhausted" };
}

function pairingHistory(encounters: readonly FixtureEncounter[]) {
  const met = new Map<TeamId, Set<TeamId>>();
  const byes = new Set<TeamId>();
  const home = new Map<TeamId, number>();
  const meet = (team: TeamId, other: TeamId) => {
    const known = met.get(team) ?? new Set<TeamId>();
    known.add(other);
    met.set(team, known);
  };
  for (const encounter of encounters) {
    const byeTeam = swissByeTeam(encounter);
    if (byeTeam) byes.add(byeTeam);
    if (encounter.home.kind !== "team" || encounter.away.kind !== "team") continue;
    meet(encounter.home.teamId, encounter.away.teamId);
    meet(encounter.away.teamId, encounter.home.teamId);
    if (encounter.closedWithoutResult) continue;
    home.set(encounter.home.teamId, (home.get(encounter.home.teamId) ?? 0) + 1);
  }
  return { met, byes, homeGames: (teamId: TeamId) => home.get(teamId) ?? 0 };
}

/** Same score group from its middle (1 v n/2 + 1 in round 1), then the groups below in rank order. */
function rivalsInOrder(top: number, rest: readonly number[], points: readonly number[]): number[] {
  const group = rest.filter((index) => points[index] === points[top]);
  const lower = rest.filter((index) => points[index] !== points[top]);
  const middle = Math.floor((group.length + 1) / 2) - 1;
  return [...group.slice(middle), ...group.slice(0, Math.max(middle, 0)).reverse(), ...lower];
}

/**
 * Takes the first rival, in preference order, that leaves the rest pairable. This returns exactly
 * what backtracking over the same order would, without its cost: with memoized backtracking alone
 * a 50-Team round took seconds, and this runs inside the approval transaction.
 */
function searchPairs(
  unpaired: readonly number[],
  canMeet: readonly (readonly boolean[])[],
  points: readonly number[],
): (readonly [number, number])[] | null {
  if (!hasPerfectMatching(unpaired, canMeet)) return null;
  const pairs: (readonly [number, number])[] = [];
  let remaining = unpaired;
  while (remaining.length > 0) {
    const [top, ...rest] = remaining as [number, ...number[]];
    const rival = rivalsInOrder(top, rest, points).find(
      (candidate) =>
        canMeet[top]?.[candidate] &&
        hasPerfectMatching(
          rest.filter((index) => index !== candidate),
          canMeet,
        ),
    );
    if (rival === undefined) throw new Panic("A pairable set must keep a pairable rival");
    pairs.push([top, rival]);
    remaining = rest.filter((index) => index !== rival);
  }
  return pairs;
}

/** Edmonds' blossom algorithm: an augmenting path from every vertex, or no perfect matching. */
function hasPerfectMatching(
  vertices: readonly number[],
  canMeet: readonly (readonly boolean[])[],
): boolean {
  const size = vertices.length;
  if (size % 2 === 1) return false;
  const adjacent = vertices.map((vertex) =>
    vertices.flatMap((other, position) => (canMeet[vertex]?.[other] ? [position] : [])),
  );
  const match = new Array<number>(size).fill(-1);
  const parent = new Array<number>(size).fill(-1);
  const base = new Array<number>(size).fill(0);
  const at = (values: readonly number[], index: number) => values[index] ?? -1;

  const commonAncestor = (first: number, second: number): number => {
    const seen = new Set<number>();
    let vertex = first;
    for (;;) {
      vertex = at(base, vertex);
      seen.add(vertex);
      if (at(match, vertex) === -1) break;
      vertex = at(parent, at(match, vertex));
    }
    vertex = second;
    for (;;) {
      vertex = at(base, vertex);
      if (seen.has(vertex)) return vertex;
      vertex = at(parent, at(match, vertex));
    }
  };

  const augmentFrom = (root: number): boolean => {
    const used = new Array<boolean>(size).fill(false);
    parent.fill(-1);
    for (let index = 0; index < size; index += 1) base[index] = index;
    used[root] = true;
    const queue = [root];
    for (let head = 0; head < queue.length; head += 1) {
      const vertex = at(queue, head);
      for (const neighbor of adjacent[vertex] ?? []) {
        if (at(base, vertex) === at(base, neighbor) || at(match, vertex) === neighbor) continue;
        if (
          neighbor === root ||
          (at(match, neighbor) !== -1 && at(parent, at(match, neighbor)) !== -1)
        ) {
          const ancestor = commonAncestor(vertex, neighbor);
          const blossom = new Set<number>();
          const markPath = (start: number, child: number) => {
            let current = start;
            let next = child;
            while (at(base, current) !== ancestor) {
              blossom.add(at(base, current));
              blossom.add(at(base, at(match, current)));
              parent[current] = next;
              next = at(match, current);
              current = at(parent, next);
            }
          };
          markPath(vertex, neighbor);
          markPath(neighbor, vertex);
          for (let index = 0; index < size; index += 1) {
            if (!blossom.has(at(base, index))) continue;
            base[index] = ancestor;
            if (!used[index]) {
              used[index] = true;
              queue.push(index);
            }
          }
        } else if (at(parent, neighbor) === -1) {
          parent[neighbor] = vertex;
          if (at(match, neighbor) === -1) {
            let current = neighbor;
            while (current !== -1) {
              const previous = at(parent, current);
              const following = at(match, previous);
              match[current] = previous;
              match[previous] = current;
              current = following;
            }
            return true;
          }
          const mate = at(match, neighbor);
          used[mate] = true;
          queue.push(mate);
        }
      }
    }
    return false;
  };

  for (let root = 0; root < size; root += 1) {
    if (at(match, root) === -1 && !augmentFrom(root)) return false;
  }
  return true;
}
