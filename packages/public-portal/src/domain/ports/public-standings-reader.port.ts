import type { TeamId } from "@futrob/shared-kernel";
import type {
  PublicStandingFormResult,
  PublicSwissProgress,
} from "../entities/public-competition.ts";
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
  readonly form: readonly PublicStandingFormResult[];
  readonly swiss?: {
    readonly buchholz: number;
    readonly byes: number;
    readonly withdrawn: boolean;
  };
}

export interface PublicStandingsSource {
  readonly rows: readonly PublicStandingsSourceRow[];
  readonly swiss: PublicSwissProgress | null;
  /**
   * League places that reach the playoffs, read from the active fixture. Null when the format has
   * no league-to-playoffs cut, or once a playoffs result has entered this table.
   */
  readonly qualifyingSpots: number | null;
  readonly updatedAt: Date;
}

export interface PublicStandingsReaderPort {
  /** The official snapshot, or null while no approved result has been projected. */
  read(scope: PublicCompetitionScope): Promise<PublicStandingsSource | null>;
}
