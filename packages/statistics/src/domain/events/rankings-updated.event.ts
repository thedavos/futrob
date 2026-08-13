import type { DomainEvent } from "@futrob/shared-kernel";
import type { RankingKind } from "../entities/ranking-snapshot.ts";

export type RankingsUpdatedEvent = DomainEvent<
  "statistics.rankings-updated",
  {
    readonly competitionId: string;
    readonly kinds: readonly RankingKind[];
  }
>;
