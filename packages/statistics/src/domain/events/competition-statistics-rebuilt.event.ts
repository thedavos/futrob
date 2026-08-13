import type { DomainEvent } from "@futrob/shared-kernel";

export type CompetitionStatisticsRebuiltEvent = DomainEvent<
  "statistics.competition-stats-rebuilt",
  {
    readonly competitionId: string;
    readonly officialResultsProjected: number;
    readonly contributionsProjected: number;
  }
>;
