import { describe, expect, it } from "vite-plus/test";
import {
  asActorId,
  asCompetitionId,
  asOrganizationId,
  type AuthorizationPort,
  type Permission,
} from "@futrob/shared-kernel";
import type { CompetitionMembership } from "../../domain/entities/competition-membership.ts";
import type { CompetitionMembershipRepository } from "../../domain/ports/competition-membership.repository.ts";
import type { CompetitionRepository } from "../../domain/ports/competition.repository.ts";
import { ChangeCompetitionMembershipRoleUseCase } from "./change-competition-membership-role.use-case.ts";

const organizationId = asOrganizationId("org-1");
const competitionId = asCompetitionId("competition-1");
const managerId = asActorId("manager-1");
const memberId = asActorId("member-1");

describe("ChangeCompetitionMembershipRoleUseCase", () => {
  it("changes only a membership in the authorized competition", async () => {
    const membership: CompetitionMembership = {
      organizationId,
      competitionId,
      actorId: memberId,
      role: "player",
      createdAt: new Date("2026-08-07T00:00:00.000Z"),
    };
    const memberships = membershipRepository(membership);
    const useCase = new ChangeCompetitionMembershipRoleUseCase({
      authorization: authorization(true),
      competitions: competitionRepository(true),
      memberships,
      ...managementDependencies(),
    });

    const result = await useCase.execute({
      actorId: managerId,
      organizationId,
      competitionId,
      targetActorId: memberId,
      role: "captain",
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value.role).toBe("captain");
  });

  it("does not reveal membership data without the contextual permission", async () => {
    const memberships = membershipRepository(null);
    const useCase = new ChangeCompetitionMembershipRoleUseCase({
      authorization: authorization(false),
      competitions: competitionRepository(true),
      memberships,
      ...managementDependencies(),
    });

    const result = await useCase.execute({
      actorId: managerId,
      organizationId,
      competitionId,
      targetActorId: memberId,
      role: "staff",
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error.code).toBe("authorization.forbidden");
  });

  it("cannot assign staff when a hidden cross-context capability is missing", async () => {
    const membership: CompetitionMembership = {
      organizationId,
      competitionId,
      actorId: memberId,
      role: "player",
      createdAt: new Date("2026-08-07T00:00:00.000Z"),
    };
    const localOnly: AuthorizationPort = {
      decide: async (request) => ({
        ...request,
        allowed: request.permission.startsWith("competitions."),
        reason: request.permission.startsWith("competitions.") ? "allowed" : "denied",
      }),
      getEffectiveAccess: async (input) => ({ ...input, roles: [], permissions: [] }),
    };
    const result = await new ChangeCompetitionMembershipRoleUseCase({
      authorization: localOnly,
      competitions: competitionRepository(true),
      memberships: membershipRepository(membership),
      ...managementDependencies(),
    }).execute({
      actorId: managerId,
      organizationId,
      competitionId,
      targetActorId: memberId,
      role: "staff",
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("authorization.forbidden");
      if ("permission" in result.error) expect(result.error.permission).toBe("teams.update");
    }
  });
});

function authorization(allowed: boolean): AuthorizationPort {
  return {
    decide: async (request) => ({ ...request, allowed, reason: allowed ? "allowed" : "denied" }),
    getEffectiveAccess: async (input) => ({ ...input, roles: [], permissions: [] }),
  };
}

function competitionRepository(found: boolean): CompetitionRepository {
  return {
    findById: async () => (found ? ({ id: competitionId } as never) : null),
  } as unknown as CompetitionRepository;
}

function membershipRepository(
  initial: CompetitionMembership | null,
): CompetitionMembershipRepository {
  let current = initial;
  return {
    add: async (membership) => membership,
    updateRole: async (membership) => {
      current = membership;
      return membership;
    },
    findByCompetitionAndActor: async () => current,
    listByActor: async (actorId) => (current?.actorId === actorId ? [current] : []),
  };
}

function managementDependencies() {
  return {
    roleCapabilities: {
      permissionsForRole: (role: CompetitionMembership["role"]): readonly Permission[] =>
        role === "staff" ? ["competitions.read", "teams.update"] : ["competitions.read"],
    },
    organizationMemberships: {
      findByOrgAndActor: async () => ({ role: "member" }),
    },
    audit: { append: async () => undefined },
    clock: { now: () => new Date("2026-08-07T00:00:00.000Z") },
    ids: { generate: () => "audit-1" },
    transaction: {
      runInTransaction: async <T>(operation: () => Promise<T>) => operation(),
    },
    mutationLock: {
      runWithActors: async <T>(
        _organizationId: unknown,
        _actorIds: unknown,
        operation: () => Promise<T>,
      ) => operation(),
    },
  };
}
