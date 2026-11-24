import { describe, expect, it } from "vite-plus/test";

import { initialsFromName } from "@/shared/presentation/initials-from-name.ts";
import {
  bracketCrests,
  bracketJunctions,
  bracketLinks,
  BRACKET_SIZE,
  COMPACT_BRACKET,
  CUP_CHAMPION,
  CUP_CLUBS,
  CUP_RUNNER_UP,
  FULL_BRACKET,
  routePath,
  routeSegments,
  routeTouches,
  type BracketLayout,
} from "./cup-bracket.model.ts";

const CENTER = BRACKET_SIZE / 2;

/** Distance from the center of the last point of a path. */
function endRadius(path: string): number {
  const [x, y] = path
    .split(/[ A-Z]/)
    .filter(Boolean)
    .slice(-2)
    .map(Number);
  return Math.hypot((x ?? Number.NaN) - CENTER, (y ?? Number.NaN) - CENTER);
}

/** First (`start`) or last (`end`) point of a path. */
function point(path: string, which: "start" | "end"): [number, number] {
  const numbers = path
    .split(/[ A-Z]/)
    .filter(Boolean)
    .map(Number);
  const [x, y] = which === "start" ? numbers.slice(0, 2) : numbers.slice(-2);
  return [x ?? Number.NaN, y ?? Number.NaN];
}

describe("demo cup results", () => {
  it("draws 16 clubs that stay distinguishable by their crest initials", () => {
    expect(CUP_CLUBS).toHaveLength(16);
    expect(new Set(CUP_CLUBS.map((club) => initialsFromName(club.name))).size).toBe(16);
  });

  it("lets exactly one club through every match, round after round", () => {
    for (let round = 1; round <= 4; round += 1) {
      for (let match = 0; match < 16 >> round; match += 1) {
        // The two sides of a match are the clubs of its half-slots that won every earlier round.
        const sides = CUP_CLUBS.filter(
          (club) => club.index >> round === match && club.wins >= round - 1,
        );
        expect(sides, `round ${round}, match ${match}`).toHaveLength(2);
        expect(sides.filter((club) => club.wins >= round)).toHaveLength(1);
      }
    }
  });

  it("names the champion and the runner-up of the final", () => {
    expect(CUP_CHAMPION).toMatchObject({ name: "Real Cuervos", stage: "champion", wins: 4 });
    expect(CUP_RUNNER_UP).toMatchObject({ name: "Atlético Norte", stage: "final", wins: 3 });
    // Same match seen from both sides.
    expect(CUP_RUNNER_UP.lastScore).toBe(CUP_CHAMPION.lastScore.split("–").reverse().join("–"));
  });
});

describe.each<[string, BracketLayout, number]>([
  ["full", FULL_BRACKET, 16],
  ["compact", COMPACT_BRACKET, 8],
])("%s bracket geometry", (_name, layout, crestCount) => {
  it("places one crest per club of its outer ring, inside the board", () => {
    const crests = bracketCrests(layout);
    expect(crests).toHaveLength(crestCount);
    expect(new Set(crests.map((crest) => `${crest.left} ${crest.top}`)).size).toBe(crestCount);
    for (const crest of crests) {
      expect(Number.parseFloat(crest.left)).toBeGreaterThan(0);
      expect(Number.parseFloat(crest.left)).toBeLessThan(100);
      expect(Number.parseFloat(crest.top)).toBeGreaterThan(0);
      expect(Number.parseFloat(crest.top)).toBeLessThan(100);
    }
  });

  it("links every crest and junction toward the trophy", () => {
    // One link per crest plus one per junction: a single-elimination tree.
    expect(bracketLinks(layout)).toHaveLength(crestCount + bracketJunctions(layout).length);
  });

  it("runs the finalists' routes to the trophy and stops the others where they lost", () => {
    for (const club of bracketCrests(layout).map((crest) => crest.club)) {
      const route = routePath(layout, club);
      expect(route).not.toBeNull();
      if (club.wins >= 3) {
        expect(endRadius(route ?? "")).toBeCloseTo(layout.trophyRadius, 1);
      } else {
        expect(endRadius(route ?? "")).toBeCloseTo(layout.radii[club.wins + 1] ?? 0, 1);
      }
    }
  });

  it("splits the champion's route into one connected segment per round, ending on the trophy", () => {
    const segments = routeSegments(layout, CUP_CHAMPION);

    expect(segments.map((segment) => segment.depth)).toEqual(
      layout === FULL_BRACKET ? [0, 1, 2, 3] : [1, 2, 3],
    );
    for (let round = 1; round < segments.length; round += 1) {
      const [x, y] = point(segments[round]?.path ?? "", "start");
      const [endX, endY] = point(segments[round - 1]?.path ?? "", "end");
      expect(x, `round ${round} starts where round ${round - 1} ended`).toBeCloseTo(endX, 1);
      expect(y).toBeCloseTo(endY, 1);
    }
    expect(endRadius(segments.at(-1)?.path ?? "")).toBeCloseTo(layout.trophyRadius, 1);
  });

  it("stops a club's segments at the match it lost, and has none for a club it hides", () => {
    // Lost in the quarter-finals: two rounds played on the full bracket, one on the compact one.
    const quarterFinalist = CUP_CLUBS.find((club) => club.wins === 1);
    const segments = quarterFinalist ? routeSegments(layout, quarterFinalist) : [];

    expect(segments.map((segment) => segment.depth)).toEqual(
      layout === FULL_BRACKET ? [0, 1] : [1],
    );
    expect(endRadius(segments.at(-1)?.path ?? "")).toBeCloseTo(layout.radii[2] ?? 0, 1);

    const outInRoundOf16 = CUP_CLUBS.find((club) => club.wins === 0);
    expect(outInRoundOf16 && routeSegments(layout, outInRoundOf16).length).toBe(
      layout === FULL_BRACKET ? 1 : 0,
    );
  });

  it("lights one junction per round on the champion's route", () => {
    const touched = bracketJunctions(layout).filter((junction) =>
      routeTouches(CUP_CHAMPION, junction),
    );
    expect(touched.map((junction) => junction.depth)).toEqual(
      layout.crestDepth === 0 ? [1, 2, 3] : [2, 3],
    );
  });
});

describe("compact bracket", () => {
  it("drops the clubs that fell in the round of 16", () => {
    const eliminated = CUP_CLUBS.find((club) => club.wins === 0);
    expect(eliminated).toBeDefined();
    expect(eliminated && routePath(COMPACT_BRACKET, eliminated)).toBeNull();
    expect(bracketCrests(COMPACT_BRACKET).every((crest) => crest.club.wins >= 1)).toBe(true);
  });
});
