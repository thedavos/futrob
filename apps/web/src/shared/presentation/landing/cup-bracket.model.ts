/**
 * Demo cup drawn in the landing hero: 16 fictional clubs, their results and the radial geometry.
 * Pure data, no React. Depth 0 is the club ring, depths 1 to 3 are the round of 16, quarterfinal
 * and semifinal junctions, and the trophy sits in the center.
 */

/** Shield archetypes of real football crests; the fictional clubs combine them with a pattern. */
export type CrestShield = "heater" | "iberian" | "french" | "crown" | "roundel" | "badge";

export type CrestPattern =
  | "plain"
  | "stripes"
  | "hoops"
  | "halves"
  | "band"
  | "sash"
  | "chevron"
  | "quarters"
  | "ring";

export interface CrestDesign {
  readonly shield: CrestShield;
  readonly pattern: CrestPattern;
  /** Field colour, then the pattern colour. Club colours, like real crests: never recoloured. */
  readonly colors: readonly [field: string, ink: string];
  /** One letter on the central plate. */
  readonly letter: string;
}

export type CupStage = "roundOf16" | "quarterfinal" | "semifinal" | "final" | "champion";

export interface CupClub {
  /** Position in the draw, clockwise from the top. Neighbours `2k` and `2k + 1` meet first. */
  readonly index: number;
  readonly name: string;
  /** Matches won: 0 fell in the round of 16, 4 lifted the cup. */
  readonly wins: number;
  /** Score of its last match, own goals first. */
  readonly lastScore: string;
  readonly stage: CupStage;
  readonly crest: CrestDesign;
}

export interface BracketLayout {
  readonly id: "full" | "compact";
  /** Depth of the ring that carries the crests: 0 shows all 16 clubs, 1 the quarterfinalists. */
  readonly crestDepth: 0 | 1;
  /** Radius per depth, in viewBox units. Depths below `crestDepth` are not drawn. */
  readonly radii: readonly [number, number, number, number];
  readonly trophyRadius: number;
}

export interface BracketPoint {
  readonly x: number;
  readonly y: number;
}

export interface BracketLink {
  readonly key: string;
  readonly depth: number;
  readonly path: string;
}

export interface BracketJunction extends BracketPoint {
  readonly key: string;
  readonly depth: number;
  readonly index: number;
}

export interface BracketCrest {
  readonly club: CupClub;
  /** Center of the crest, as a percentage of the board. */
  readonly left: string;
  readonly top: string;
}

export const BRACKET_SIZE = 720;

const CENTER = BRACKET_SIZE / 2;
const CLUB_COUNT = 16;
const LAST_DEPTH = 3;
const SLOT_DEGREES = 360 / CLUB_COUNT;
const STAGES: readonly CupStage[] = ["roundOf16", "quarterfinal", "semifinal", "final", "champion"];

function crest(
  shield: CrestShield,
  pattern: CrestPattern,
  field: string,
  ink: string,
  letter: string,
): CrestDesign {
  return { shield, pattern, colors: [field, ink], letter };
}

const DRAW: readonly (readonly [
  name: string,
  wins: number,
  lastScore: string,
  crest: CrestDesign,
])[] = [
  ["Unión Barrio", 0, "1–3", crest("heater", "stripes", "#1f4e8c", "#e8edf3", "U")],
  ["Real Cuervos", 4, "2–1", crest("crown", "halves", "#1b1b1f", "#c9a227", "C")],
  ["Rayo Austral", 0, "0–1", crest("iberian", "band", "#c8102e", "#f2f2f2", "R")],
  ["FC Titanes", 1, "1–2", crest("roundel", "ring", "#0f6b3a", "#f4f1e6", "T")],
  ["Deportivo Sur", 2, "0–2", crest("french", "chevron", "#5b2a86", "#f0e9f7", "S")],
  ["Sporting Lomas", 0, "1–2", crest("heater", "hoops", "#0a7c66", "#f5f5f0", "L")],
  ["CD Estrella", 1, "0–1", crest("badge", "plain", "#e0a100", "#1a1a1a", "E")],
  ["Inter Costa", 0, "0–2", crest("iberian", "quarters", "#1565c0", "#111111", "I")],
  ["Halcones Rojos", 1, "1–3", crest("french", "sash", "#b3121f", "#1a1a1a", "H")],
  ["Academia Mirador", 0, "2–3", crest("roundel", "plain", "#2e7d32", "#fdd835", "M")],
  ["Atlético Norte", 3, "1–2", crest("heater", "stripes", "#c62828", "#f5f5f5", "N")],
  ["Juventud Central", 0, "0–2", crest("badge", "halves", "#263238", "#eceff1", "J")],
  ["Olímpico Sur", 0, "1–2", crest("crown", "band", "#0d47a1", "#ffffff", "O")],
  ["Real Bahía", 2, "1–2", crest("iberian", "hoops", "#00838f", "#fafafa", "B")],
  ["Los Cóndores", 1, "2–3", crest("french", "quarters", "#4e342e", "#f9a825", "C")],
  ["Atlético Puerto", 0, "0–3", crest("heater", "chevron", "#283593", "#ef6c00", "P")],
];

export const CUP_CLUBS: readonly CupClub[] = DRAW.map(([name, wins, lastScore, crest], index) => ({
  index,
  name,
  wins,
  lastScore,
  stage: STAGES[wins] ?? "roundOf16",
  crest,
}));

/** All 16 clubs on the outer ring. */
export const FULL_BRACKET: BracketLayout = {
  id: "full",
  crestDepth: 0,
  radii: [318, 245, 178, 112],
  trophyRadius: 50,
};

/** Narrow screens: the round of 16 is dropped and the quarterfinalists take the outer ring. */
export const COMPACT_BRACKET: BracketLayout = {
  id: "compact",
  crestDepth: 1,
  radii: [0, 300, 216, 136],
  trophyRadius: 64,
};

function clubAt(index: number): CupClub {
  const club = CUP_CLUBS[index];
  if (club === undefined) {
    throw new RangeError(`No club at draw position ${index}`);
  }
  return club;
}

export const CUP_CHAMPION: CupClub = clubAt(CUP_CLUBS.findIndex((club) => club.wins === 4));
export const CUP_RUNNER_UP: CupClub = clubAt(CUP_CLUBS.findIndex((club) => club.wins === 3));

/** Degrees clockwise from the top for the node that covers `2 ** depth` neighbouring clubs. */
function nodeAngle(depth: number, index: number): number {
  const span = 2 ** depth;
  return SLOT_DEGREES * (index * span + span / 2);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function polar(radius: number, degrees: number): BracketPoint {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: round(CENTER + radius * Math.sin(radians)),
    y: round(CENTER - radius * Math.cos(radians)),
  };
}

function radiusAt(layout: BracketLayout, depth: number): number {
  return layout.radii[depth] ?? layout.trophyRadius;
}

/** Radial line toward the center, then an arc along the next ring up to the parent junction. */
function linkSegment(layout: BracketLayout, depth: number, index: number): string {
  const angle = nodeAngle(depth, index);
  if (depth === LAST_DEPTH) {
    const end = polar(layout.trophyRadius, angle);
    return `L${end.x} ${end.y}`;
  }
  const radius = radiusAt(layout, depth + 1);
  const parentAngle = nodeAngle(depth + 1, index >> 1);
  const elbow = polar(radius, angle);
  const end = polar(radius, parentAngle);
  const sweep = parentAngle > angle ? 1 : 0;
  return `L${elbow.x} ${elbow.y}A${radius} ${radius} 0 0 ${sweep} ${end.x} ${end.y}`;
}

function moveTo(layout: BracketLayout, depth: number, index: number): string {
  const start = polar(radiusAt(layout, depth), nodeAngle(depth, index));
  return `M${start.x} ${start.y}`;
}

/** Every link of the layout, each drawn from the outside toward the center. */
export function bracketLinks(layout: BracketLayout): readonly BracketLink[] {
  const links: BracketLink[] = [];
  for (let depth = layout.crestDepth; depth <= LAST_DEPTH; depth += 1) {
    for (let index = 0; index < CLUB_COUNT >> depth; index += 1) {
      links.push({
        key: `${depth}-${index}`,
        depth,
        path: moveTo(layout, depth, index) + linkSegment(layout, depth, index),
      });
    }
  }
  return links;
}

/** Match points between the crest ring and the trophy. */
export function bracketJunctions(layout: BracketLayout): readonly BracketJunction[] {
  const junctions: BracketJunction[] = [];
  for (let depth = layout.crestDepth + 1; depth <= LAST_DEPTH; depth += 1) {
    for (let index = 0; index < CLUB_COUNT >> depth; index += 1) {
      junctions.push({
        key: `${depth}-${index}`,
        depth,
        index,
        ...polar(radiusAt(layout, depth), nodeAngle(depth, index)),
      });
    }
  }
  return junctions;
}

/** Deepest junction the club reached: where it lost, or the semifinal it won on the way to the final. */
function reachedDepth(club: CupClub): number {
  return Math.min(club.wins + 1, LAST_DEPTH);
}

/** True when the club played the match at that junction. */
export function routeTouches(club: CupClub, junction: BracketJunction): boolean {
  return junction.depth <= reachedDepth(club) && club.index >> junction.depth === junction.index;
}

/** True when the layout shows a crest for the club. */
export function showsClub(layout: BracketLayout, club: CupClub): boolean {
  return club.wins >= layout.crestDepth;
}

/**
 * Path the club travelled, from its crest to the match it lost. Finalists reach the trophy.
 * `null` when the layout does not show the club.
 */
export function routePath(layout: BracketLayout, club: CupClub): string | null {
  if (!showsClub(layout, club)) {
    return null;
  }
  const lastLink = Math.min(club.wins, LAST_DEPTH);
  let path = moveTo(layout, layout.crestDepth, club.index >> layout.crestDepth);
  for (let depth = layout.crestDepth; depth <= lastLink; depth += 1) {
    path += linkSegment(layout, depth, club.index >> depth);
  }
  return path;
}

/** One round of a route: the link a club played at `depth`, from its node toward the centre. */
export interface RouteSegment {
  readonly depth: number;
  readonly path: string;
}

/**
 * The same route as `routePath`, one path per round so each can be drawn after the one before it.
 * Empty when the layout does not show the club.
 */
export function routeSegments(layout: BracketLayout, club: CupClub): readonly RouteSegment[] {
  if (!showsClub(layout, club)) {
    return [];
  }
  const segments: RouteSegment[] = [];
  for (let depth = layout.crestDepth; depth <= Math.min(club.wins, LAST_DEPTH); depth += 1) {
    const index = club.index >> depth;
    segments.push({
      depth,
      path: moveTo(layout, depth, index) + linkSegment(layout, depth, index),
    });
  }
  return segments;
}

/** Rounds between the outermost link and the trophy; the champion's route ends on the trophy. */
export const ROUTE_LAST_DEPTH = LAST_DEPTH;

function percent(value: number): string {
  return `${round((value / BRACKET_SIZE) * 100)}%`;
}

/** Crests of the layout's outer ring, clockwise from the top. */
export function bracketCrests(layout: BracketLayout): readonly BracketCrest[] {
  return CUP_CLUBS.filter((club) => showsClub(layout, club)).map((club) => {
    const center = polar(
      radiusAt(layout, layout.crestDepth),
      nodeAngle(layout.crestDepth, club.index >> layout.crestDepth),
    );
    return { club, left: percent(center.x), top: percent(center.y) };
  });
}
