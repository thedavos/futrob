import type { CompetitionStatus } from "@futrob/competitions";
import type { PublicCompetitionStatus } from "../policies/public-visibility.ts";
import type { PublicCompetitionKey } from "../public-competition-key.ts";

/** A competition's public address and freshness. Carries no internal id beyond the key. */
export interface PublishedCompetitionDirectoryEntry {
  readonly key: PublicCompetitionKey;
  readonly status: CompetitionStatus;
  readonly updatedAt: Date;
}

/** Cross-organization listing of competitions by status, for crawlable surfaces (sitemap). */
export interface PublishedCompetitionDirectoryPort {
  listByStatus(
    statuses: readonly PublicCompetitionStatus[],
    limit: number,
  ): Promise<readonly PublishedCompetitionDirectoryEntry[]>;
}
