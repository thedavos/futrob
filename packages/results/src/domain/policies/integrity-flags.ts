import type { ExternalReference, ProviderMatch } from "@futrob/game-data";

/**
 * Blocking integrity flags (DEC-022). They are data-quality signals that stop an
 * automatic approval and route the case to `organizer_review`. Eligibility,
 * completeness of the selection and reference uniqueness are invariants, not
 * flags: they fail the command and an operator cannot waive them.
 */
export type IntegrityFlagCode = "provider_data_incomplete" | "provider_match_disconnected";

export interface IntegrityFlag {
  readonly code: IntegrityFlagCode;
  readonly providerMatchRef: ExternalReference;
}

export function integrityFlagsFor(
  entries: ReadonlyArray<{
    readonly providerMatchRef: ExternalReference;
    readonly match: ProviderMatch;
  }>,
): IntegrityFlag[] {
  const flags: IntegrityFlag[] = [];
  for (const { providerMatchRef, match } of entries) {
    if (match.metadata.completeness !== "complete") {
      flags.push({ code: "provider_data_incomplete", providerMatchRef });
    }
    if (match.metadata.wasDisconnected) {
      flags.push({ code: "provider_match_disconnected", providerMatchRef });
    }
  }
  return flags;
}
