import {
  Panic,
  compareByTime,
  TIME_SORT_DIRECTION,
  type CompetitionId,
  type OrganizationId,
} from "@futrob/shared-kernel";
import type { CompetitionStatus } from "../domain/entities/competition.ts";
import type {
  CompetitionDraft,
  CompetitionRepository,
} from "../domain/ports/competition.repository.ts";

export class FakeCompetitionRepository implements CompetitionRepository {
  readonly rows = new Map<CompetitionId, CompetitionDraft>();

  constructor(drafts: readonly CompetitionDraft[] = []) {
    for (const draft of drafts) this.rows.set(draft.competition.id, draft);
  }

  async saveDraft(draft: CompetitionDraft): Promise<CompetitionDraft> {
    this.rows.set(draft.competition.id, draft);
    return draft;
  }

  async publish(draft: CompetitionDraft): Promise<CompetitionDraft> {
    this.rows.set(draft.competition.id, draft);
    return draft;
  }

  async saveCover(draft: CompetitionDraft): Promise<CompetitionDraft> {
    const current = this.rows.get(draft.competition.id);
    if (!current || current.competition.organizationId !== draft.competition.organizationId) {
      throw new Panic("Cannot update cover for a missing competition");
    }
    const saved = {
      ...current,
      competition: {
        ...current.competition,
        cover: draft.competition.cover,
        updatedAt: draft.competition.updatedAt,
      },
    };
    this.rows.set(saved.competition.id, saved);
    return saved;
  }

  async changeStatus(
    draft: CompetitionDraft,
    expected: CompetitionStatus,
  ): Promise<CompetitionDraft | null> {
    const current = this.rows.get(draft.competition.id);
    if (
      !current ||
      current.competition.organizationId !== draft.competition.organizationId ||
      current.competition.status !== expected
    )
      return null;
    const saved = {
      ...current,
      competition: {
        ...current.competition,
        status: draft.competition.status,
        updatedAt: draft.competition.updatedAt,
      },
    };
    this.rows.set(saved.competition.id, saved);
    return saved;
  }

  async findById(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
  ): Promise<CompetitionDraft | null> {
    const draft = this.rows.get(competitionId) ?? null;
    return draft?.competition.organizationId === organizationId ? draft : null;
  }

  async findByCreationKey(creationKey: string): Promise<CompetitionDraft | null> {
    return (
      [...this.rows.values()].find((draft) => draft.competition.creationKey === creationKey) ?? null
    );
  }

  async findRulesByCompetitionId(competitionId: CompetitionId) {
    return this.rows.get(competitionId)?.rules ?? null;
  }

  async listByOrganization(organizationId: OrganizationId) {
    return [...this.rows.values()]
      .map((draft) => draft.competition)
      .filter((competition) => competition.organizationId === organizationId)
      .sort(compareByTime((item) => item.updatedAt, TIME_SORT_DIRECTION.desc));
  }

  all(): readonly CompetitionDraft[] {
    return [...this.rows.values()];
  }
}
