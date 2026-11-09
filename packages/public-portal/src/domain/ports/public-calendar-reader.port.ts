import type { TeamId } from "@futrob/shared-kernel";
import type { PublicCompetitionScope } from "./published-competition-reader.port.ts";

/** One scheduled Encounter whose two sides are already known teams. */
export interface PublicCalendarSourceEntry {
  readonly roundNumber: number;
  readonly scheduledStartAt: Date;
  readonly homeTeamId: TeamId;
  readonly awayTeamId: TeamId;
  /** Whether an approved OfficialResult exists. The result itself is not exposed here. */
  readonly official: boolean;
}

export interface PublicCalendarReaderPort {
  list(scope: PublicCompetitionScope): Promise<readonly PublicCalendarSourceEntry[]>;
}
