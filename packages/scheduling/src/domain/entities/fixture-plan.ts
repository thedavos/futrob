import type {
  Brand,
  CompetitionId,
  EncounterId,
  OrganizationId,
  TeamId,
} from "@futrob/shared-kernel";

export type FixtureFormat = "league" | "knockout" | "groups-knockout" | "league-playoffs";
export type FixtureStageId = Brand<string, "FixtureStageId">;
export type FixtureRoundId = Brand<string, "FixtureRoundId">;

export type FixtureParticipantSlot =
  | { readonly kind: "team"; readonly teamId: TeamId }
  | { readonly kind: "bye" }
  | { readonly kind: "winner"; readonly encounterId: EncounterId }
  | {
      readonly kind: "group-rank";
      readonly stageId: FixtureStageId;
      readonly groupId: string;
      readonly rank: number;
    }
  | {
      readonly kind: "stage-rank";
      readonly stageId: FixtureStageId;
      readonly rank: number;
    };

export interface FixtureEncounter {
  readonly id: EncounterId;
  readonly stageId: FixtureStageId;
  readonly roundId: FixtureRoundId;
  readonly order: number;
  readonly groupId?: string;
  readonly home: FixtureParticipantSlot;
  readonly away: FixtureParticipantSlot;
  readonly scheduledStartAt: Date;
  readonly officialMatchCount: 1 | 2;
}

export interface FixtureRound {
  readonly id: FixtureRoundId;
  readonly stageId: FixtureStageId;
  readonly number: number;
  readonly scheduledStartAt: Date;
  readonly encounters: readonly FixtureEncounter[];
}

export interface FixtureStage {
  readonly id: FixtureStageId;
  readonly kind: "league" | "groups" | "knockout" | "playoffs";
  readonly order: number;
  readonly rounds: readonly FixtureRound[];
}

export interface FixturePlan {
  readonly id: string;
  readonly revision: number;
  readonly generationKey: string;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly rulesVersion: number;
  readonly generationVersion: number;
  readonly format: FixtureFormat;
  readonly timeZone: string;
  readonly seed: readonly TeamId[];
  readonly stages: readonly FixtureStage[];
}

export interface FixtureGenerationSpec {
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly generationVersion: number;
  readonly rulesVersion: number;
  readonly format: FixtureFormat;
  readonly timeZone: string;
  readonly startsAt: Date;
  readonly roundIntervalDays: number;
  readonly officialMatchCounts: {
    readonly regular: 1 | 2;
    readonly knockout: 1 | 2;
  };
  readonly seed: readonly TeamId[];
  readonly homeAndAway: boolean;
  readonly groups?: {
    readonly count: number;
    readonly qualifiersPerGroup: number;
  };
  readonly playoffs?: {
    readonly teamCount: number;
  };
}

export function asFixtureStageId(value: string): FixtureStageId {
  return value as FixtureStageId;
}

export function asFixtureRoundId(value: string): FixtureRoundId {
  return value as FixtureRoundId;
}
