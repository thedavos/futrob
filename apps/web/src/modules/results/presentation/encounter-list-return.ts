import { z } from "zod";
import {
  competitionEncountersSearchSchema,
  type CompetitionEncountersSearch,
} from "./competition-encounters-model.ts";

/**
 * The lists that open a Match Center. Only these named routes are return targets, so the
 * search can never send the user to an arbitrary URL.
 */
export const encounterListOrigins = ["encounters", "matches", "player-matches"] as const;

export type EncounterListOrigin = (typeof encounterListOrigins)[number];

/** Match Center search: the list it was opened from and that list's filters. */
export const encounterDetailSearchSchema = competitionEncountersSearchSchema.extend({
  from: z.enum(encounterListOrigins).optional().catch(undefined),
});

export type EncounterDetailSearch = z.infer<typeof encounterDetailSearchSchema>;

export interface EncounterListReturn {
  readonly from: EncounterListOrigin;
  readonly search: CompetitionEncountersSearch;
}

/** Null for a direct visit, which goes back to the staff list without filters. */
export function encounterListReturn(search: EncounterDetailSearch): EncounterListReturn | null {
  const { from, ...filters } = search;
  return from ? { from, search: filters } : null;
}
