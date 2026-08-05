import type { CompetitionId, OrganizationId } from "@futrob/shared-kernel";
import type { Competition } from "../entities/competition.ts";
import type { CompetitionRules } from "../entities/competition-rules.ts";

export interface CompetitionDraft {
  readonly competition: Competition;
  readonly rules: CompetitionRules;
}

export interface CompetitionRepository {
  saveDraft(draft: CompetitionDraft): Promise<CompetitionDraft>;
  findById(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
  ): Promise<CompetitionDraft | null>;
  findByCreationKey(creationKey: string): Promise<CompetitionDraft | null>;
  findRulesByCompetitionId(competitionId: CompetitionId): Promise<CompetitionRules | null>;
}
