import type { TeamId } from "@futrob/shared-kernel";
import type { PublicMatchScore } from "../entities/public-competition.ts";
import type { PublicCompetitionScope } from "./published-competition-reader.port.ts";

/** One scheduled Encounter whose two sides are already known teams. */
export interface PublicCalendarSourceEntry {
  readonly roundNumber: number;
  readonly scheduledStartAt: Date;
  readonly homeTeamId: TeamId;
  readonly awayTeamId: TeamId;
  /**
   * Goals of the approved OfficialResult in slot order, home-oriented; null while none is
   * approved. Nothing else of the result reaches this port.
   */
  readonly officialScore: readonly PublicMatchScore[] | null;
}

export interface PublicCalendarReaderPort {
  list(scope: PublicCompetitionScope): Promise<readonly PublicCalendarSourceEntry[]>;
}
