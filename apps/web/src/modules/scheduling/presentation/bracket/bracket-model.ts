import type {
  CompetitionFixtureView,
  FixtureEncounterView,
  FixtureRoundName,
  FixtureRoundView,
  FixtureSide,
  FixtureStageKind,
  FixtureStageView,
} from "../competition-fixture-view.ts";

/** Stages that eliminate. League and group stages are tables, never a draw. */
const BRACKET_STAGE_KINDS: ReadonlySet<FixtureStageKind> = new Set(["knockout", "playoffs"]);

/** Canvas units in CSS pixels. Wires and nodes share them, so lines meet the cards exactly. */
export const BRACKET_GEOMETRY = {
  nodeWidth: 224,
  nodeHeight: 136,
  rowGap: 40,
  columnGap: 64,
} as const;

export type BracketSideKey = "home" | "away";

export type BracketNode = {
  readonly encounter: FixtureEncounterView;
  readonly round: FixtureRoundView;
  readonly columnIndex: number;
  /** 1-based position inside its round, which is the fixture's encounter order. */
  readonly position: number;
  readonly isFinal: boolean;
  /** Left edge of the card. */
  readonly x: number;
  /** Vertical centre of the card; wires attach here. */
  readonly y: number;
};

export type BracketWire = {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly side: BracketSideKey;
  readonly path: string;
};

export type BracketColumn = {
  readonly round: FixtureRoundView;
  readonly x: number;
};

export type BracketStageLayout = {
  readonly id: string;
  readonly kind: FixtureStageKind;
  readonly columns: readonly BracketColumn[];
  readonly nodes: readonly BracketNode[];
  readonly wires: readonly BracketWire[];
  readonly width: number;
  readonly height: number;
  readonly encounterCount: number;
  readonly byeCount: number;
  readonly twoLegCount: number;
  /** Winner places whose source Encounter is not drawable here (unknown, ambiguous or elsewhere). */
  readonly unlinkedWinnerCount: number;
};

export type BracketView = {
  readonly timeZone: string;
  readonly stages: readonly BracketStageLayout[];
};

/** The knockout part of a fixture, or null when the competition has nothing to draw. */
export function bracketView(view: CompetitionFixtureView): BracketView | null {
  const stages = view.stages
    .filter((stage) => BRACKET_STAGE_KINDS.has(stage.kind))
    .map((stage) => ({ ...stage, rounds: stage.rounds.filter((r) => r.encounters.length > 0) }))
    .filter((stage) => stage.rounds.length > 0);
  if (stages.length === 0) return null;
  return {
    timeZone: view.timeZone,
    stages: stages.map((stage) => layoutBracketStage(stage, view.stages)),
  };
}

/**
 * Lays rounds out left to right. Each round splits the full height evenly, so in a halving
 * draw every card sits midway between the two cards that feed it. Lines come only from
 * `winner.from`: a place the fixture cannot trace back gets no line.
 */
export function layoutBracketStage(
  stage: FixtureStageView,
  allStages: readonly FixtureStageView[] = [stage],
): BracketStageLayout {
  const { nodeWidth, nodeHeight, rowGap, columnGap } = BRACKET_GEOMETRY;
  const pitch = nodeHeight + rowGap;
  const tallest = Math.max(...stage.rounds.map((round) => round.encounters.length));
  const height = tallest * pitch;
  const lastColumn = stage.rounds.length - 1;

  const columns = stage.rounds.map((round, columnIndex) => ({
    round,
    x: columnIndex * (nodeWidth + columnGap),
  }));
  const nodes: BracketNode[] = columns.flatMap(({ round, x }, columnIndex) => {
    const slot = height / round.encounters.length;
    return round.encounters.map((encounter, index) => ({
      encounter,
      round,
      columnIndex,
      position: index + 1,
      isFinal: columnIndex === lastColumn && round.encounters.length === 1,
      x,
      y: slot * (index + 0.5),
    }));
  });
  const byId = new Map(nodes.map((node) => [node.encounter.id, node]));

  const wires: BracketWire[] = [];
  let unlinkedWinnerCount = 0;
  for (const target of nodes) {
    for (const side of ["home", "away"] as const) {
      const slot = target.encounter[side];
      if (slot.kind !== "winner") continue;
      const sourceId = slot.from ? uniqueSourceId(slot.from, allStages) : null;
      const source = sourceId ? byId.get(sourceId) : undefined;
      if (!source || source.columnIndex >= target.columnIndex) {
        unlinkedWinnerCount += 1;
        continue;
      }
      wires.push({
        id: `${source.encounter.id}->${target.encounter.id}:${side}`,
        sourceId: source.encounter.id,
        targetId: target.encounter.id,
        side,
        path: elbow(source, target),
      });
    }
  }

  const encounters = nodes.map((node) => node.encounter);
  return {
    id: stage.id,
    kind: stage.kind,
    columns,
    nodes,
    wires,
    width: columns.length * nodeWidth + (columns.length - 1) * columnGap,
    height,
    encounterCount: encounters.length,
    byeCount: encounters.filter((e) => isBye(e.home) || isBye(e.away)).length,
    twoLegCount: encounters.filter((e) => e.officialMatchCount === 2).length,
    unlinkedWinnerCount,
  };
}

/**
 * The fixture names a source by round and order, and orders count from 1 inside each round.
 * A name that more than one Encounter answers to is ambiguous, so it draws nothing.
 */
function uniqueSourceId(
  from: { readonly round: FixtureRoundName; readonly order: number },
  stages: readonly FixtureStageView[],
): string | null {
  const matches = stages.flatMap((stage) =>
    stage.rounds
      .filter((round) => sameRoundName(round.name, from.round))
      .flatMap((round) => round.encounters[from.order - 1] ?? []),
  );
  return matches.length === 1 ? (matches[0]?.id ?? null) : null;
}

export function sameRoundName(left: FixtureRoundName, right: FixtureRoundName): boolean {
  if (left.kind !== right.kind) return false;
  if ((left.kind === "matchday" || left.kind === "round") && "number" in right) {
    return left.number === right.number;
  }
  return true;
}

/** Out of the source's right edge, down the gap before the target, into its left edge. */
function elbow(source: BracketNode, target: BracketNode): string {
  const startX = source.x + BRACKET_GEOMETRY.nodeWidth;
  const endX = target.x;
  const bendX = endX - BRACKET_GEOMETRY.columnGap / 2;
  return `M${startX} ${source.y} H${bendX} V${target.y} H${endX}`;
}

const isBye = (side: FixtureSide) => side.kind === "bye";

export function isEncounterWithBye(encounter: FixtureEncounterView): boolean {
  return isBye(encounter.home) || isBye(encounter.away);
}

export function isEncounterOpen(encounter: FixtureEncounterView): boolean {
  return encounter.home.kind !== "team" || encounter.away.kind !== "team";
}

export type BracketTeamOption = { readonly teamId: string; readonly name: string };

/** Teams the draw already places by name, alphabetically. Unnamed Teams cannot be chosen. */
export function bracketTeamOptions(
  bracket: BracketView,
  locale: string,
): readonly BracketTeamOption[] {
  const teams = new Map<string, string>();
  for (const stage of bracket.stages) {
    for (const node of stage.nodes) {
      for (const side of [node.encounter.home, node.encounter.away]) {
        if (side.kind === "team" && side.name) teams.set(side.teamId, side.name);
      }
    }
  }
  return [...teams]
    .map(([teamId, name]) => ({ teamId, name }))
    .sort((left, right) => left.name.localeCompare(right.name, locale));
}

/** Whether an Encounter stays highlighted for the chosen Team. No Team keeps every one. */
export function matchesTeam(encounter: FixtureEncounterView, teamId: string | null): boolean {
  if (!teamId) return true;
  return [encounter.home, encounter.away].some(
    (side) => side.kind === "team" && side.teamId === teamId,
  );
}
