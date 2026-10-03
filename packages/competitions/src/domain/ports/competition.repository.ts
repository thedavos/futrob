import type { CompetitionId, OrganizationId } from "@futrob/shared-kernel";
import type { Competition, CompetitionStatus } from "../entities/competition.ts";
import type { CompetitionRules } from "../entities/competition-rules.ts";

export interface CompetitionDraft {
  readonly competition: Competition;
  readonly rules: CompetitionRules;
}

export interface CompetitionRepository {
  saveDraft(draft: CompetitionDraft): Promise<CompetitionDraft>;
  publish?(draft: CompetitionDraft): Promise<CompetitionDraft>;
  /** Persists only the cover, preserving the current structure and status. */
  saveCover(draft: CompetitionDraft): Promise<CompetitionDraft>;
  /**
   * Compare-and-set status transition. Persists `draft.competition.status` only while the
   * stored status still equals `expected`; returns `null` when another writer won.
   */
  changeStatus(
    draft: CompetitionDraft,
    expected: CompetitionStatus,
  ): Promise<CompetitionDraft | null>;
  findById(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
  ): Promise<CompetitionDraft | null>;
  findByCreationKey(creationKey: string): Promise<CompetitionDraft | null>;
  findRulesByCompetitionId(competitionId: CompetitionId): Promise<CompetitionRules | null>;
  listByOrganization(organizationId: OrganizationId): Promise<Competition[]>;
}
