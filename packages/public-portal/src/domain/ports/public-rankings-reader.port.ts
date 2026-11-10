import type { TeamId } from "@futrob/shared-kernel";
import type { PublicRankingKind } from "../entities/public-competition.ts";
import type { PublicCompetitionScope } from "./published-competition-reader.port.ts";

export interface PublicRankingSourceRow {
  readonly position: number;
  readonly playerProfileId: string;
  readonly teamId: TeamId | null;
  readonly value: number;
  readonly matchesPlayed: number;
}

export interface PublicRankingSource {
  readonly rows: readonly PublicRankingSourceRow[];
  readonly updatedAt: Date;
}

export interface PublicRankingsReaderPort {
  /** The official snapshot of one kind, or null while nothing has been projected. */
  read(scope: PublicCompetitionScope, kind: PublicRankingKind): Promise<PublicRankingSource | null>;
}

export interface PublicPlayerDirectoryPort {
  /**
   * The public name of each player: the game account they declared on that Team's roster in
   * this competition. A player without a roster entry or account is absent, never guessed.
   */
  namesOf(
    scope: PublicCompetitionScope,
    players: readonly { readonly playerProfileId: string; readonly teamId: TeamId | null }[],
  ): Promise<ReadonlyMap<string, string>>;
}
