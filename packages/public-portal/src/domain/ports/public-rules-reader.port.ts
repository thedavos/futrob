import type { CompetitionMatchRules } from "@futrob/competitions";
import type { PublicCompetitionScope } from "./published-competition-reader.port.ts";

export interface PublicRulesSource {
  readonly teams: { readonly min: number; readonly max: number | null };
  readonly regularStage: CompetitionMatchRules | null;
  readonly knockoutStage: CompetitionMatchRules | null;
  readonly maxRosterSize: number | null;
}

export interface PublicRulesReaderPort {
  /** The published rules, or null when the competition has none stored. */
  read(scope: PublicCompetitionScope): Promise<PublicRulesSource | null>;
}
