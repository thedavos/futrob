import { describe, expect, it } from "vite-plus/test";
import { asActorId, asCompetitionId, asOrganizationId } from "@futrob/shared-kernel";
import type { CompetitionMembership } from "../../domain/entities/competition-membership.ts";
import { CompetitionNotFound } from "../../domain/errors/competition.errors.ts";
import type { CompetitionMembershipRepository } from "../../domain/ports/competition-membership.repository.ts";
import type {
  CompetitionDraft,
  CompetitionRepository,
} from "../../domain/ports/competition.repository.ts";
import { JoinCompetitionUseCase } from "./join-competition.use-case.ts";

const organizationId = asOrganizationId("org-1");
const competitionId = asCompetitionId("competition-1");
const actorId = asActorId("actor-1");
const createdAt = new Date("2026-07-31T12:00:00.000Z");

class FakeCompetitionRepository implements CompetitionRepository {
  async saveDraft(draft: CompetitionDraft): Promise<CompetitionDraft> {
    return draft;
  }

  async findById(
    requestedOrganizationId: typeof organizationId,
    requestedId: typeof competitionId,
  ) {
    return requestedOrganizationId === organizationId && requestedId === competitionId
      ? competitionDraft
      : null;
  }

  async findByCreationKey(): Promise<CompetitionDraft | null> {
    return null;
  }

  async findRulesByCompetitionId() {
    return competitionDraft.rules;
  }
}

class FakeMembershipRepository implements CompetitionMembershipRepository {
  readonly rows = new Map<string, CompetitionMembership>();

  async add(membership: CompetitionMembership): Promise<CompetitionMembership> {
    const key = `${membership.competitionId}:${membership.actorId}`;
    const existing = this.rows.get(key);
    if (existing) return existing;
    this.rows.set(key, membership);
    return membership;
  }

  async findByCompetitionAndActor(
    requestedCompetitionId: typeof competitionId,
    requestedActorId: typeof actorId,
  ): Promise<CompetitionMembership | null> {
    return this.rows.get(`${requestedCompetitionId}:${requestedActorId}`) ?? null;
  }
}

const competitionDraft: CompetitionDraft = {
  competition: {
    id: competitionId,
    organizationId,
    name: "Copa Inicial",
    status: "draft",
    modality: "fc-clubs",
    gameEdition: "FC 26",
    platform: "playstation",
    region: "south-america",
    timeZone: "America/Lima",
    format: "league",
    createdByActorId: actorId,
    createdAt,
    updatedAt: createdAt,
  },
  rules: {
    competitionId,
    version: 1,
    regularStage: null,
    knockoutStage: null,
    awayGoalsEnabled: false,
    maxRosterSize: null,
    requireVerifiedExternalClub: false,
    createdAt,
  },
};

describe("JoinCompetitionUseCase", () => {
  it("creates one contextual membership and returns it on retry", async () => {
    const memberships = new FakeMembershipRepository();
    const useCase = new JoinCompetitionUseCase({
      competitions: new FakeCompetitionRepository(),
      memberships,
      clock: { now: () => createdAt },
    });

    const input = { organizationId, competitionId, actorId, role: "player" as const };
    const first = await useCase.execute(input);
    const retried = await useCase.execute(input);

    expect(first.isOk()).toBe(true);
    expect(retried).toEqual(first);
    expect(memberships.rows.size).toBe(1);
  });

  it("rejects a competition outside the requested organization", async () => {
    const useCase = new JoinCompetitionUseCase({
      competitions: new FakeCompetitionRepository(),
      memberships: new FakeMembershipRepository(),
      clock: { now: () => createdAt },
    });

    const result = await useCase.execute({
      organizationId: asOrganizationId("org-2"),
      competitionId,
      actorId,
      role: "player",
    });

    expect(result.isOk()).toBe(false);
    expect(!result.isOk() && CompetitionNotFound.is(result.error)).toBe(true);
  });
});
