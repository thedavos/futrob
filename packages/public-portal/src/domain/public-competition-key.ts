/**
 * What a spectator types in a public URL: `/{organizationSlug}/{competition}` (ADR-0024).
 *
 * The organization slug scopes the lookup, so a competition shown under another organization's
 * slug is not found. The `competition` part stays opaque: how it relates to the internal id
 * (identical today, a slug or short code later) is decided by one `PublishedCompetitionReaderPort`
 * adapter, and no use case may assume more.
 */
export interface PublicCompetitionKey {
  readonly organizationSlug: string;
  readonly competition: string;
}

export function asPublicCompetitionKey(
  organizationSlug: string,
  competition: string,
): PublicCompetitionKey {
  return { organizationSlug, competition };
}
