import type { CompetitionId, OrganizationId, TeamId } from "@futrob/shared-kernel";
import type { FixtureFormat, FixturePlan } from "../entities/fixture-plan.ts";
import type { SeriesResolutionMode } from "../entities/fixture-plan.ts";

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
  findByGenerationKey(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    generationKey: string,
  ): Promise<FixturePlan | null>;
  save(plan: FixturePlan): Promise<{
    readonly plan: FixturePlan;
    readonly created: boolean;
  }>;
}
