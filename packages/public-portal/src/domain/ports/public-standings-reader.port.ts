import type { TeamId } from "@futrob/shared-kernel";
import type { PublicCompetitionScope } from "./published-competition-reader.port.ts";

export interface PublicStandingsSourceRow {
  readonly position: number;
  readonly teamId: TeamId;
  readonly played: number;
  readonly wins: number;
  readonly draws: number;
  readonly losses: number;
  readonly goalsFor: number;
  readonly goalsAgainst: number;
  readonly goalDifference: number;
  readonly points: number;
}

export interface PublicStandingsSource {
  readonly rows: readonly PublicStandingsSourceRow[];
  readonly updatedAt: Date;
}

export interface PublicStandingsReaderPort {
  /** The official snapshot, or null while no approved result has been projected. */
  read(scope: PublicCompetitionScope): Promise<PublicStandingsSource | null>;
}
