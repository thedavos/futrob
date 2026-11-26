import type { EncounterScoreView } from "@/modules/results/presentation/competition-encounters-model.ts";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import type { BracketStageLayout } from "./bracket-model.ts";
import type { BracketNodeStatus, BracketResults } from "./bracket-results.ts";

export type Scope = { readonly organizationId: string; readonly competitionId: string };

export type TeamFilter = {
  /** Team the reader follows through the draw; null highlights every Encounter. */
  readonly teamId: string | null;
  readonly onTeamChange: (teamId: string | null) => void;
};

/** The draw as a canvas or as a list by round (UX-BRK-001); kept in the URL. */
export type BracketViewMode = "canvas" | "list";

export type ViewModeControl = {
  readonly view: BracketViewMode;
  readonly onViewChange: (view: BracketViewMode) => void;
};

export type Formatters = {
  readonly kickoff: Intl.DateTimeFormat;
  readonly day: Intl.DateTimeFormat;
};

export type StageProps = {
  readonly formatters: Formatters;
  readonly results: BracketResults;
  readonly scope: Scope;
  readonly stage: BracketStageLayout;
  readonly t: Translator;
  readonly teamId: string | null;
};

export function bracketStatusLabel(status: BracketNodeStatus, t: Translator): string {
  switch (status) {
    case "bye":
      return t("bracket.status.bye");
    case "pending":
      return t("bracket.status.pending");
    case "scheduled":
      return t("bracket.status.scheduled");
    case "awaiting_result":
      return t("bracket.status.awaitingResult");
    case "official":
      return t("bracket.status.official");
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

type Leg = { readonly homeGoals: number; readonly awayGoals: number };

/** «Ida 1–0 · Vuelta 1–1»: what both views show under a two-match score. */
export function bracketLegsLabel(score: EncounterScoreView | null, t: Translator): string | null {
  if (!score || score.kind === "single") return null;
  const [first, second] = score.legs;
  if (!first || !second) return null;
  return t("bracket.legs", { first: legText(first), second: legText(second) });
}

/**
 * The official score as a link's accessible name reads it: total, and for two-match series
 * the first and second leg too, so the list and the canvas say the same thing.
 */
export function bracketScoreSpoken(score: EncounterScoreView | null, t: Translator): string | null {
  if (!score) return null;
  const legs = bracketLegsLabel(score, t);
  switch (score.kind) {
    case "single":
      return t("bracket.score", { home: String(score.homeGoals), away: String(score.awayGoals) });
    case "aggregate":
      return `${t("bracket.score.aggregate", {
        home: String(score.aggregateHome),
        away: String(score.aggregateAway),
      })}${legs ? `. ${legs}` : ""}`;
    case "independent":
      return legs ? `${t("bracket.score.series")}. ${legs}` : null;
    default: {
      const exhaustive: never = score;
      return exhaustive;
    }
  }
}

const legText = (leg: Leg) => `${leg.homeGoals}–${leg.awayGoals}`;

export const px = (value: number) => `${value}px`;
