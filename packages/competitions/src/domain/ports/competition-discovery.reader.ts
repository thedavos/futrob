import type { CompetitionId } from "@futrob/shared-kernel";
import type {
  Competition,
  CompetitionFormat,
  CompetitionPlatform,
  CompetitionRegion,
} from "../entities/competition.ts";
import type { DiscoverableCompetitionStatus } from "../policies/discoverable-competition.ts";

export type CompetitionDiscoverySort = "updated-desc" | "name-asc";

export interface CompetitionDiscoveryFilter {
  readonly q?: string;
  readonly format?: CompetitionFormat;
  readonly status?: DiscoverableCompetitionStatus;
  readonly region?: CompetitionRegion;
  readonly platform?: CompetitionPlatform;
  readonly sort: CompetitionDiscoverySort;
  readonly cursor?: string;
  readonly limit: number;
}

export interface DiscoverableCompetitionRecord {
  readonly competition: Competition;
  readonly approvedTeamCount: number;
}

export interface DiscoverableCompetitionPage {
  readonly items: readonly DiscoverableCompetitionRecord[];
  readonly total: number;
  readonly nextCursor: string | null;
}

export interface CompetitionDiscoveryReader {
  list(filter: CompetitionDiscoveryFilter): Promise<DiscoverableCompetitionPage>;
  findById(competitionId: CompetitionId): Promise<DiscoverableCompetitionRecord | null>;
}
