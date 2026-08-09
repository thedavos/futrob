import type {
  CompetitionDraft,
  CompetitionMembership,
  CompetitionMembershipRepository,
  CompetitionRepository,
} from "@futrob/competitions";
import type { ActorId, CompetitionId, OrganizationId } from "@futrob/shared-kernel";

export class InMemoryCompetitionRepository implements CompetitionRepository {
  private readonly byId = new Map<CompetitionId, CompetitionDraft>();

  async saveDraft(draft: CompetitionDraft): Promise<CompetitionDraft> {
    this.byId.set(draft.competition.id, draft);
    return draft;
  }

  async publish(draft: CompetitionDraft): Promise<CompetitionDraft> {
    this.byId.set(draft.competition.id, draft);
    return draft;
  }

  async findById(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
  ): Promise<CompetitionDraft | null> {
    const draft = this.byId.get(competitionId) ?? null;
    return draft?.competition.organizationId === organizationId ? draft : null;
  }

  async findByCreationKey(creationKey: string): Promise<CompetitionDraft | null> {
    return (
      [...this.byId.values()].find((draft) => draft.competition.creationKey === creationKey) ?? null
    );
  }

  async findRulesByCompetitionId(competitionId: CompetitionId) {
    return this.byId.get(competitionId)?.rules ?? null;
  }

  async listByOrganization(organizationId: OrganizationId) {
    return [...this.byId.values()]
      .map((draft) => draft.competition)
      .filter((competition) => competition.organizationId === organizationId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
}

export class InMemoryCompetitionMembershipRepository implements CompetitionMembershipRepository {
  readonly rows = new Map<string, CompetitionMembership>();

  async add(membership: CompetitionMembership): Promise<CompetitionMembership> {
    const key = `${membership.competitionId}:${membership.actorId}`;
    const existing = this.rows.get(key);
    if (existing) return existing;
    this.rows.set(key, membership);
    return membership;
  }

  async updateRole(membership: CompetitionMembership): Promise<CompetitionMembership> {
    this.rows.set(`${membership.competitionId}:${membership.actorId}`, membership);
    return membership;
  }

  async findByCompetitionAndActor(
    competitionId: CompetitionId,
    actorId: ActorId,
  ): Promise<CompetitionMembership | null> {
    return this.rows.get(`${competitionId}:${actorId}`) ?? null;
  }

  async listByActor(actorId: ActorId): Promise<readonly CompetitionMembership[]> {
    return [...this.rows.values()].filter((membership) => membership.actorId === actorId);
  }
}
