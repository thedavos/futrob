import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import type { FixtureEncounterView } from "../competition-fixture-view.ts";
import { isEncounterOpen, isEncounterWithBye, type BracketStageLayout } from "./bracket-model.ts";

export type Scope = { readonly organizationId: string; readonly competitionId: string };

export type TeamFilter = {
  /** Team the reader follows through the draw; null highlights every Encounter. */
  readonly teamId: string | null;
  readonly onTeamChange: (teamId: string | null) => void;
};

export type Formatters = {
  readonly kickoff: Intl.DateTimeFormat;
  readonly day: Intl.DateTimeFormat;
};

export type StageProps = {
  readonly formatters: Formatters;
  readonly scope: Scope;
  readonly stage: BracketStageLayout;
  readonly t: Translator;
  readonly teamId: string | null;
};

/** What the fixture alone can say. Results and advancement belong to other pages. */
export function encounterStatus(encounter: FixtureEncounterView, t: Translator): string {
  if (isEncounterWithBye(encounter)) return t("bracket.status.bye");
  if (isEncounterOpen(encounter)) return t("bracket.status.pending");
  return t("bracket.status.scheduled");
}

export const px = (value: number) => `${value}px`;
