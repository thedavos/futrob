import {
  isDiscoverableCompetitionStatus,
  type Competition,
  type CompetitionDiscoveryFilter,
  type CompetitionDiscoveryReader,
  type DiscoverableCompetitionPage,
  type DiscoverableCompetitionRecord,
} from "@futrob/competitions";
import { compareTime, type CompetitionId } from "@futrob/shared-kernel";
import type { InMemoryCompetitionEntryRepository } from "./competition-entry.repositories.ts";
import { decodeDiscoveryCursor, encodeDiscoveryCursor } from "./discovery-cursor.ts";
import type { InMemoryCompetitionRepository } from "./in-memory.repository.ts";

export class InMemoryCompetitionDiscoveryReader implements CompetitionDiscoveryReader {
  constructor(
    private readonly competitions: InMemoryCompetitionRepository,
    private readonly entries: InMemoryCompetitionEntryRepository,
  ) {}

  async list(filter: CompetitionDiscoveryFilter): Promise<DiscoverableCompetitionPage> {
    const matched = this.competitions
      .all()
      .map((draft) => draft.competition)
      .filter((competition) => matchesDiscoveryFilter(competition, filter))
      .sort((left, right) => compareDiscoverable(left, right, filter.sort));
    const cursor = decodeDiscoveryCursor(filter.cursor, filter.sort);
    const afterCursor = cursor
      ? matched.filter((competition) => isAfterCursor(competition, cursor))
      : matched;
    const page = afterCursor.slice(0, filter.limit);
    const last = page.at(-1);
    return {
      items: page.map((competition) => ({
        competition,
        approvedTeamCount: this.approvedCount(competition),
      })),
      total: matched.length,
      nextCursor:
        afterCursor.length > filter.limit && last
          ? encodeDiscoveryCursor(
              filter.sort === "name-asc"
                ? { sort: "name-asc", name: last.name, id: last.id }
                : {
                    sort: "updated-desc",
                    updatedAt: last.updatedAt.toISOString(),
                    id: last.id,
                  },
            )
          : null,
    };
  }

  async findById(competitionId: CompetitionId): Promise<DiscoverableCompetitionRecord | null> {
    const competition = this.competitions
      .all()
      .map((draft) => draft.competition)
      .find((item) => item.id === competitionId);
    if (!competition || !isDiscoverableCompetitionStatus(competition.status)) return null;
    return { competition, approvedTeamCount: this.approvedCount(competition) };
  }

  private approvedCount(competition: Competition): number {
    return [...this.entries.rows.values()].filter(
      (entry) =>
        entry.organizationId === competition.organizationId &&
        entry.competitionId === competition.id &&
        entry.status === "approved",
    ).length;
  }
}

function matchesDiscoveryFilter(
  competition: Competition,
  filter: CompetitionDiscoveryFilter,
): boolean {
  if (!isDiscoverableCompetitionStatus(competition.status)) return false;
  if (filter.status && competition.status !== filter.status) return false;
  if (filter.format && competition.format !== filter.format) return false;
  if (filter.region && competition.region !== filter.region) return false;
  if (filter.platform && competition.platform !== filter.platform) return false;
  if (filter.q && !competition.name.toLocaleLowerCase().includes(filter.q.toLocaleLowerCase())) {
    return false;
  }
  return true;
}

function compareDiscoverable(
  left: Competition,
  right: Competition,
  sort: CompetitionDiscoveryFilter["sort"],
): number {
  if (sort === "name-asc") {
    const byName = left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
    return byName !== 0 ? byName : left.id.localeCompare(right.id);
  }
  const byUpdated = compareTime(right.updatedAt, left.updatedAt);
  return byUpdated !== 0 ? byUpdated : right.id.localeCompare(left.id);
}

function isAfterCursor(
  competition: Competition,
  cursor: NonNullable<ReturnType<typeof decodeDiscoveryCursor>>,
): boolean {
  if (cursor.sort === "name-asc") {
    const byName = competition.name.localeCompare(cursor.name, undefined, { sensitivity: "base" });
    return byName > 0 || (byName === 0 && competition.id.localeCompare(cursor.id) > 0);
  }
  const byUpdated = compareTime(competition.updatedAt, new Date(cursor.updatedAt));
  return byUpdated < 0 || (byUpdated === 0 && competition.id.localeCompare(cursor.id) < 0);
}
