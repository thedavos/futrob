import type { CompetitionEncounterDto, CompetitionEncounterStatusDto } from "@futrob/api-contracts";
import {
  encounterScoreView,
  type EncounterScoreView,
} from "@/modules/results/presentation/competition-encounters-model.ts";
import type { FixtureEncounterView } from "../competition-fixture-view.ts";
import {
  isEncounterOpen,
  isEncounterWithBye,
  type BracketNode,
  type BracketSideKey,
  type BracketStageLayout,
  type BracketView,
} from "./bracket-model.ts";

/** What the competition's Encounter list says about one Encounter of the draw. */
export type BracketResult = {
  readonly status: CompetitionEncounterStatusDto;
  readonly score: EncounterScoreView | null;
};

/**
 * Results by Encounter id. Null when the list could not be read: the draw still shows, only
 * without scores and with the status the fixture alone can tell.
 */
export type BracketResults = ReadonlyMap<string, BracketResult> | null;

export function bracketResults(
  encounters: readonly CompetitionEncounterDto[] | undefined,
): BracketResults {
  if (!encounters) return null;
  return new Map(
    encounters.map((encounter) => [
      encounter.encounterId,
      { status: encounter.status, score: encounterScoreView(encounter) },
    ]),
  );
}

/** A bye or an open place is a property of the draw; everything else is the Encounter list's. */
export type BracketNodeStatus = "bye" | "pending" | CompetitionEncounterStatusDto;

export function bracketNodeStatus(
  encounter: FixtureEncounterView,
  result: BracketResult | undefined,
): BracketNodeStatus {
  if (isEncounterWithBye(encounter)) return "bye";
  if (isEncounterOpen(encounter)) return "pending";
  return result?.status ?? "scheduled";
}

/**
 * The side that won: the Team the fixture already moved on, else the official score's leader.
 * A level official score with no Team moved on names nobody rather than guessing.
 */
export function bracketWinner(
  node: Pick<BracketNode, "advanced">,
  result: BracketResult | undefined,
): BracketSideKey | null {
  if (node.advanced) return node.advanced;
  const score = result?.score;
  if (score?.kind === "single" || score?.kind === "aggregate") {
    return score.leader === "draw" ? null : score.leader;
  }
  return null;
}

/** The stage final's winner by name, once the final has one. */
export function bracketChampionName(
  stage: BracketStageLayout,
  results: BracketResults,
): string | null {
  const final = stage.nodes.find((node) => node.encounter.id === stage.champion?.finalId);
  if (!final) return null;
  const winner = bracketWinner(final, results?.get(final.encounter.id));
  const side = winner ? final.encounter[winner] : null;
  return side?.kind === "team" && side.name ? side.name : null;
}

/** One side's goals for the score cell; legs only for two-leg Encounters. */
export type BracketSideScore = {
  readonly goals: string;
  readonly legs: string | null;
};

export function bracketSideScore(
  score: EncounterScoreView | null,
  side: BracketSideKey,
): BracketSideScore | null {
  if (!score) return null;
  const goalsOf = (leg: { readonly homeGoals: number; readonly awayGoals: number }) =>
    side === "home" ? leg.homeGoals : leg.awayGoals;
  switch (score.kind) {
    case "single":
      return { goals: String(side === "home" ? score.homeGoals : score.awayGoals), legs: null };
    case "aggregate":
      return {
        goals: String(side === "home" ? score.aggregateHome : score.aggregateAway),
        legs: score.legs.map(goalsOf).join("·"),
      };
    case "independent":
      return { goals: score.legs.map(goalsOf).join("·"), legs: null };
    default: {
      const exhaustive: never = score;
      return exhaustive;
    }
  }
}

export type BracketStatusCounts = {
  readonly official: number;
  readonly awaiting_result: number;
  readonly upcoming: number;
};

/** Played-out Encounters only: byes never count as a result. */
export function bracketStatusCounts(
  bracket: BracketView,
  results: BracketResults,
): BracketStatusCounts {
  let official = 0;
  let awaiting = 0;
  let upcoming = 0;
  for (const node of bracket.stages.flatMap((stage) => stage.nodes)) {
    const status = bracketNodeStatus(node.encounter, results?.get(node.encounter.id));
    if (status === "official") official += 1;
    else if (status === "awaiting_result") awaiting += 1;
    else if (status !== "bye") upcoming += 1;
  }
  return { official, awaiting_result: awaiting, upcoming };
}
