import type { TeamId } from "@futrob/shared-kernel";
import type { PublicBracketStageKind, PublicMatchScore } from "../entities/public-competition.ts";
import type { PublicCompetitionScope } from "./published-competition-reader.port.ts";

/** One side as the fixture knows it; the adapter already turned Encounter ids into positions. */
export type PublicBracketSourceSide =
  | { readonly kind: "team"; readonly teamId: TeamId }
  | { readonly kind: "bye" }
  /** `from` is null when the source Encounter is not drawable in this bracket. */
  | {
      readonly kind: "winner";
      readonly from: { readonly roundNumber: number; readonly order: number } | null;
    }
  | { readonly kind: "group_rank"; readonly groupId: string; readonly rank: number }
  | { readonly kind: "stage_rank"; readonly rank: number };

export interface PublicBracketSourceEncounter {
  readonly order: number;
  readonly scheduledStartAt: Date;
  readonly officialMatchCount: 1 | 2;
  readonly home: PublicBracketSourceSide;
  readonly away: PublicBracketSourceSide;
  readonly closedWithoutResult: boolean;
  /** Approved goals in slot order, home-oriented; null while none is approved. */
  readonly officialScore: readonly PublicMatchScore[] | null;
}

export interface PublicBracketSourceRound {
  readonly number: number;
  readonly scheduledStartAt: Date;
  readonly encounters: readonly PublicBracketSourceEncounter[];
}

export interface PublicBracketSourceStage {
  readonly kind: PublicBracketStageKind;
  readonly rounds: readonly PublicBracketSourceRound[];
}

export interface PublicBracketSource {
  readonly timeZone: string;
  /** Knockout and playoff stages only, in play order. League and group stages are tables. */
  readonly stages: readonly PublicBracketSourceStage[];
}

export interface PublicBracketReaderPort {
  /** The elimination part of the active fixture, or null when there is no fixture yet. */
  read(scope: PublicCompetitionScope): Promise<PublicBracketSource | null>;
}
