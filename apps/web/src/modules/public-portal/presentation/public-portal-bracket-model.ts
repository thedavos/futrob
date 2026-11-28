import type {
  GetPublicBracketResponse,
  PublicBracketEncounterDto,
  PublicBracketSideDto,
  PublicBracketStageDto,
  PublicMatchScoreDto,
} from "@futrob/api-contracts";

type PublicBracket = NonNullable<GetPublicBracketResponse["bracket"]>;
type PublicBracketRound = PublicBracketStageDto["rounds"][number];

/** Canvas units in CSS pixels, matching `BRACKET_GEOMETRY` in the authenticated bracket canvas. */
export const PUBLIC_BRACKET_GEOMETRY = {
  nodeWidth: 232,
  nodeHeight: 136,
  rowGap: 40,
  columnGap: 64,
  sideOffset: 18,
  championWidth: 168,
  championGap: 48,
} as const;

export type PublicBracketSideKey = "home" | "away";

export type PublicBracketNodeStatus =
  | "bye"
  | "pending"
  | "scheduled"
  | "awaiting_result"
  | "official";

export interface PublicBracketNode {
  readonly id: string;
  readonly encounter: PublicBracketEncounterDto;
  readonly round: PublicBracketRound;
  readonly columnIndex: number;
  readonly isFinal: boolean;
  readonly advanced: PublicBracketSideKey | null;
  readonly x: number;
  readonly y: number;
}

export interface PublicBracketWire {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly side: PublicBracketSideKey;
  readonly state: "advanced" | "pending";
  readonly path: string;
}

export interface PublicBracketChampion {
  readonly finalId: string;
  readonly x: number;
  readonly y: number;
  readonly path: string;
}

export interface PublicBracketColumn {
  readonly round: PublicBracketRound;
  readonly x: number;
}

export interface PublicBracketStageLayout {
  readonly kind: PublicBracketStageDto["kind"];
  readonly columns: readonly PublicBracketColumn[];
  readonly nodes: readonly PublicBracketNode[];
  readonly wires: readonly PublicBracketWire[];
  readonly champion: PublicBracketChampion | null;
  readonly width: number;
  readonly height: number;
  readonly encounterCount: number;
  readonly byeCount: number;
  readonly twoLegCount: number;
}

export interface PublicBracketSideScore {
  readonly goals: number;
  readonly legs: string | null;
}

export function isBracketBye(encounter: PublicBracketEncounterDto): boolean {
  return encounter.home.kind === "bye" || encounter.away.kind === "bye";
}

export function publicBracketSideScore(
  encounter: PublicBracketEncounterDto,
  side: PublicBracketSideKey,
): PublicBracketSideScore | null {
  if (isBracketBye(encounter)) return null;
  const score = encounter.score;
  if (!score || score.length === 0) return null;
  const pick = (leg: PublicMatchScoreDto) => (side === "home" ? leg.homeGoals : leg.awayGoals);
  const goals = score.reduce((sum, leg) => sum + pick(leg), 0);
  const legs = score.length > 1 ? score.map(pick).join(" · ") : null;
  return { goals, legs };
}

export function publicBracketNodeStatus(
  encounter: PublicBracketEncounterDto,
): PublicBracketNodeStatus {
  if (isBracketBye(encounter)) return "bye";
  if (encounter.status === "official") return "official";
  if (encounter.status === "awaiting_result") return "awaiting_result";
  if (encounter.home.kind !== "team" || encounter.away.kind !== "team") return "pending";
  return "scheduled";
}

export function publicBracketWinner(node: PublicBracketNode): PublicBracketSideKey | null {
  if (node.advanced) return node.advanced;
  const { encounter } = node;
  if (encounter.home.kind === "team" && encounter.away.kind === "bye") return "home";
  if (encounter.away.kind === "team" && encounter.home.kind === "bye") return "away";
  if (encounter.status !== "official" || !encounter.score || encounter.score.length === 0) {
    return null;
  }
  const home = encounter.score.reduce((sum, leg) => sum + leg.homeGoals, 0);
  const away = encounter.score.reduce((sum, leg) => sum + leg.awayGoals, 0);
  if (home > away) return "home";
  if (away > home) return "away";
  return null;
}

export function publicBracketChampionName(stage: PublicBracketStageLayout): string | null {
  if (!stage.champion) return null;
  const finalNode = stage.nodes.find((node) => node.id === stage.champion?.finalId);
  if (!finalNode) return null;
  const winner = publicBracketWinner(finalNode);
  if (!winner) return null;
  const side = finalNode.encounter[winner];
  return side.kind === "team" ? side.name : null;
}

export function publicBracketMatchesTeam(
  encounter: PublicBracketEncounterDto,
  teamName: string | null,
): boolean {
  if (!teamName) return true;
  return (
    (encounter.home.kind === "team" && encounter.home.name === teamName) ||
    (encounter.away.kind === "team" && encounter.away.name === teamName)
  );
}

export function publicBracketTeamNames(bracket: PublicBracket, locale: string): readonly string[] {
  const names = new Set<string>();
  const add = (side: PublicBracketSideDto) => {
    if (side.kind === "team") names.add(side.name);
  };
  for (const stage of bracket.stages) {
    for (const round of stage.rounds) {
      for (const encounter of round.encounters) {
        add(encounter.home);
        add(encounter.away);
      }
    }
  }
  return [...names].sort((left, right) => left.localeCompare(right, locale));
}

export function publicBracketStatusCounts(stages: readonly PublicBracketStageLayout[]) {
  let official = 0;
  let awaiting = 0;
  let upcoming = 0;
  for (const stage of stages) {
    for (const node of stage.nodes) {
      const status = publicBracketNodeStatus(node.encounter);
      if (status === "official") official += 1;
      else if (status === "awaiting_result") awaiting += 1;
      else if (status === "scheduled" || status === "pending") upcoming += 1;
    }
  }
  return { official, awaiting, upcoming };
}

type PlacedNode = Omit<PublicBracketNode, "advanced">;

function nodeKey(roundNumber: number, order: number): string {
  return `r${roundNumber}:e${order}`;
}

function elbowPath(source: PlacedNode, target: PlacedNode, side: PublicBracketSideKey): string {
  const { nodeWidth, sideOffset } = PUBLIC_BRACKET_GEOMETRY;
  const x1 = source.x + nodeWidth;
  const y1 = source.y;
  const x2 = target.x;
  const y2 = target.y + (side === "home" ? -sideOffset : sideOffset);
  const midX = x1 + (x2 - x1) / 2;
  return `M${x1} ${y1} H${midX} V${y2} H${x2}`;
}

function teamSourceNode(
  teamName: string,
  columnIndex: number,
  nodes: readonly PlacedNode[],
): { readonly node: PlacedNode; readonly side: PublicBracketSideKey } | null {
  for (let column = columnIndex - 1; column >= 0; column -= 1) {
    const matches = nodes.flatMap((node) =>
      node.columnIndex !== column
        ? []
        : (["home", "away"] as const)
            .filter((side) => {
              const slot = node.encounter[side];
              return slot.kind === "team" && slot.name === teamName;
            })
            .map((side) => ({ node, side })),
    );
    if (matches.length === 1) return matches[0] ?? null;
    if (matches.length > 1) return null;
  }
  return null;
}

/** Computes round columns, node coordinates, SVG elbow connectors, and the Champion card position. */
export function layoutPublicBracketStage(stage: PublicBracketStageDto): PublicBracketStageLayout {
  const { nodeWidth, nodeHeight, rowGap, columnGap, championGap, championWidth } =
    PUBLIC_BRACKET_GEOMETRY;
  const rounds = stage.rounds.filter((round) => round.encounters.length > 0);
  const pitch = nodeHeight + rowGap;
  const tallest = Math.max(1, ...rounds.map((round) => round.encounters.length));
  const height = tallest * pitch;
  const lastColumn = rounds.length - 1;

  const columns: PublicBracketColumn[] = rounds.map((round, columnIndex) => ({
    round,
    x: columnIndex * (nodeWidth + columnGap),
  }));

  const placed: PlacedNode[] = columns.flatMap(({ round, x }, columnIndex) => {
    const slot = height / round.encounters.length;
    return round.encounters.map((encounter, index) => ({
      id: nodeKey(round.number, encounter.order),
      encounter,
      round,
      columnIndex,
      isFinal: columnIndex === lastColumn && round.encounters.length === 1,
      x,
      y: slot * (index + 0.5),
    }));
  });

  const byKey = new Map(placed.map((node) => [node.id, node]));
  const wires: PublicBracketWire[] = [];
  const advanced = new Map<string, PublicBracketSideKey>();

  for (const target of placed) {
    for (const side of ["home", "away"] as const) {
      const slot = target.encounter[side];
      if (slot.kind === "team") {
        if (target.columnIndex === 0) continue;
        const source = teamSourceNode(slot.name, target.columnIndex, placed);
        if (!source) continue;
        advanced.set(source.node.id, source.side);
        wires.push({
          id: `${source.node.id}->${target.id}:${side}`,
          sourceId: source.node.id,
          targetId: target.id,
          side,
          state: "advanced",
          path: elbowPath(source.node, target, side),
        });
        continue;
      }
      if (slot.kind === "winner") {
        const source = byKey.get(nodeKey(slot.roundNumber, slot.order));
        if (!source || source.columnIndex >= target.columnIndex) continue;
        wires.push({
          id: `${source.id}->${target.id}:${side}`,
          sourceId: source.id,
          targetId: target.id,
          side,
          state: "pending",
          path: elbowPath(source, target, side),
        });
      }
    }
  }

  const nodes: PublicBracketNode[] = placed.map((node) => ({
    ...node,
    advanced: advanced.get(node.id) ?? null,
  }));

  const finalNode = nodes.find((node) => node.isFinal) ?? null;
  const drawWidth =
    columns.length > 0 ? columns.length * nodeWidth + (columns.length - 1) * columnGap : nodeWidth;
  const champion: PublicBracketChampion | null = finalNode
    ? {
        finalId: finalNode.id,
        x: drawWidth + championGap,
        y: finalNode.y,
        path: `M${drawWidth} ${finalNode.y} H${drawWidth + championGap}`,
      }
    : null;

  const encounters = nodes.map((node) => node.encounter);
  return {
    kind: stage.kind,
    columns,
    nodes,
    wires,
    champion,
    width: champion ? champion.x + championWidth : drawWidth,
    height,
    encounterCount: encounters.length,
    byeCount: encounters.filter(isBracketBye).length,
    twoLegCount: encounters.filter((encounter) => encounter.officialMatchCount === 2).length,
  };
}
