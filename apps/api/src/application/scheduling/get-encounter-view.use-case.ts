import {
  encounterStartOf,
  officialMatchSchedules,
  type EncounterScheduleSnapshot,
  type OfficialMatch,
  type OfficialMatchSchedule,
} from "@futrob/scheduling";
import type { EncounterId } from "@futrob/shared-kernel";
import {
  summarizeEncounter,
  type EncounterSummary,
  type EncounterSummaryDependencies,
} from "./encounter-summary.ts";
import {
  officialEncounterScore,
  type OfficialResultScoreSource,
  type OrientedEncounterScore,
} from "./official-encounter-scores.ts";

export type EncounterView = EncounterSummary & {
  readonly officialMatches: readonly OfficialMatchSchedule[];
  readonly score: readonly OrientedEncounterScore[] | null;
};

export type GetEncounterViewDependencies = EncounterSummaryDependencies & {
  readonly officialMatches: {
    listByEncounter(
      encounterId: EncounterId,
    ): Promise<readonly Pick<OfficialMatch, "slot" | "scheduledStartAt">[]>;
  };
  readonly officialResults: {
    getApprovedByEncounter(encounterId: EncounterId): Promise<OfficialResultScoreSource | null>;
  };
};

/** Callers authorize `encounters.read` on the snapshot scope before reading the view. */
export class GetEncounterViewUseCase {
  constructor(private readonly deps: GetEncounterViewDependencies) {}

  async execute(snapshot: EncounterScheduleSnapshot): Promise<EncounterView | null> {
    const [summary, matches, approvedResult] = await Promise.all([
      summarizeEncounter(this.deps, snapshot),
      this.deps.officialMatches.listByEncounter(snapshot.encounterId),
      this.deps.officialResults.getApprovedByEncounter(snapshot.encounterId),
    ]);
    if (!summary) return null;
    const officialMatches = officialMatchSchedules(snapshot, matches);
    return {
      ...summary,
      scheduledStartAt: encounterStartOf(officialMatches) ?? snapshot.scheduledStartAt,
      officialMatches,
      score: officialEncounterScore(snapshot, approvedResult),
    };
  }
}
