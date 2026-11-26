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

export const px = (value: number) => `${value}px`;
