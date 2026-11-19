import { z } from "zod";

/**
 * Search params of the competition detail that open the application with a team name prefilled,
 * set by the landing «Unirme» handoff. A malformed value is dropped, never an error.
 */
export const competitionApplySearchSchema = z.object({
  apply: z.literal(true).optional().catch(undefined),
  // The router parses a numeric value such as "10754" into a number.
  teamName: z
    .union([z.string(), z.number()])
    .transform(String)
    .pipe(z.string().trim().min(1).max(120))
    .optional()
    .catch(undefined),
  // Onboarding finished without the EA club because the provider did not answer.
  clubAssociation: z.literal("failed").optional().catch(undefined),
});

export type CompetitionApplySearch = z.output<typeof competitionApplySearchSchema>;

export function competitionApplySearch(
  teamName: string | null,
  clubAssociation?: "failed",
): CompetitionApplySearch {
  return { apply: true, teamName: teamName ?? undefined, clubAssociation };
}
