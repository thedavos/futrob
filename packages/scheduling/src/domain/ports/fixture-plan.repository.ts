import type { CompetitionId, EncounterId, OrganizationId, TeamId } from "@futrob/shared-kernel";
import type {
  FixtureEncounter,
  FixtureFormat,
  FixturePlan,
  SeriesResolutionMode,
} from "../entities/fixture-plan.ts";

export interface CompetitionFixtureSourceSnapshot {
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly status: "draft" | "published" | "paused" | "finished" | "archived";
  readonly format: FixtureFormat;
  readonly timeZone: string;
  readonly rulesVersion: number;
  readonly officialMatchCounts: {
    readonly regular: 1 | 2;
    readonly knockout: 1 | 2;
  };
  readonly resolutionModes: {
    readonly regular: SeriesResolutionMode;
    readonly knockout: SeriesResolutionMode;
  };
  readonly approvedParticipants: readonly TeamId[];
}

export interface CompetitionFixtureSourcePort {
  load(input: {
    readonly organizationId: OrganizationId;
    readonly competitionId: CompetitionId;
  }): Promise<CompetitionFixtureSourceSnapshot | null>;
}

export interface FixturePlanRepository {
  findById(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    fixturePlanId: string,
  ): Promise<FixturePlan | null>;
  findByGenerationVersion(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    generationVersion: number,
  ): Promise<FixturePlan | null>;
  listActive(organizationId: OrganizationId, competitionId: CompetitionId): Promise<FixturePlan[]>;
  save(plan: FixturePlan): Promise<{
    readonly plan: FixturePlan;
    readonly created: boolean;
  }>;
  updateEncounter(input: {
    readonly organizationId: OrganizationId;
    readonly competitionId: CompetitionId;
    readonly fixturePlanId: string;
    readonly revision: number;
    readonly encounter: FixtureEncounter;
  }): Promise<FixturePlan | null>;
  markSuperseded(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    exceptPlanId: string,
  ): Promise<void>;
  containsEncounter(input: {
    readonly organizationId: OrganizationId;
    readonly competitionId: CompetitionId;
    readonly encounterId: EncounterId;
  }): Promise<boolean>;
}
