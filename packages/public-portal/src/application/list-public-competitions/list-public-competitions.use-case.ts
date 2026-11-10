import { compareByTime, TIME_SORT_DIRECTION } from "@futrob/shared-kernel";
import type { PublicCompetitionListing } from "../../domain/entities/public-competition.ts";
import {
  isPubliclyVisibleStatus,
  PUBLIC_COMPETITION_STATUSES,
} from "../../domain/policies/public-visibility.ts";
import type { PublishedCompetitionDirectoryPort } from "../../domain/ports/published-competition-directory.port.ts";

/** Well under the 50,000 URLs a single sitemap file may hold, with room for every section. */
export const MAX_PUBLIC_COMPETITIONS = 5_000;

export class ListPublicCompetitionsUseCase {
  constructor(private readonly directory: PublishedCompetitionDirectoryPort) {}

  /**
   * Every competition a spectator may open, as its public address only. The visibility policy is
   * applied again here, so a source that returns a draft cannot put it in a sitemap.
   */
  async execute(): Promise<{ readonly competitions: readonly PublicCompetitionListing[] }> {
    const entries = await this.directory.listByStatus(
      PUBLIC_COMPETITION_STATUSES,
      MAX_PUBLIC_COMPETITIONS,
    );
    const competitions = entries
      .filter((entry) => isPubliclyVisibleStatus(entry.status))
      .map((entry) => ({
        organizationSlug: entry.key.organizationSlug,
        competitionKey: entry.key.competition,
        updatedAt: entry.updatedAt,
      }))
      .sort(compareByTime((item) => item.updatedAt, TIME_SORT_DIRECTION.desc))
      .slice(0, MAX_PUBLIC_COMPETITIONS);
    return { competitions };
  }
}
