import type { Brand } from "@futrob/shared-kernel";

/**
 * The opaque key a spectator uses in a public URL. It is deliberately not a
 * `CompetitionId`: how the key relates to the internal id (identical, slug, short code)
 * is a product decision (ADR-0024). Only a `PublishedCompetitionReaderPort` resolves it.
 */
export type PublicCompetitionKey = Brand<string, "PublicCompetitionKey">;

export function asPublicCompetitionKey(value: string): PublicCompetitionKey {
  // SAFETY: Compile-time brand marker; the HTTP boundary validates the string shape.
  return value as PublicCompetitionKey;
}
