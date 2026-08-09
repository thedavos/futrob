import {
  err,
  ok,
  type ActorId,
  type AuthorizationPort,
  type AuthorizationMutationLockPort,
  type ClockPort,
  type CompetitionId,
  type OrganizationId,
  type Permission,
  type IdGeneratorPort,
  type Result,
  type TransactionPort,
} from "@futrob/shared-kernel";
import type {
  CompetitionMembership,
  CompetitionMembershipRole,
} from "../../domain/entities/competition-membership.ts";
import {
  CompetitionAuthorizationForbidden,
  CompetitionMembershipNotFound,
  CompetitionNotFound,
  type ChangeCompetitionMembershipRoleError,
} from "../../domain/errors/competition.errors.ts";
import type { CompetitionMembershipRepository } from "../../domain/ports/competition-membership.repository.ts";
import type { CompetitionRepository } from "../../domain/ports/competition.repository.ts";
import { COMPETITION_PERMISSION } from "../../domain/policies/competition-permissions.ts";

interface OrganizationMembershipReader {
  findByOrgAndActor(
    organizationId: OrganizationId,
    actorId: ActorId,
  ): Promise<{ readonly role?: string } | null>;
}

interface CompetitionRoleAuditPort {
  append(entry: {
    readonly id: string;
    readonly actorId: ActorId;
    readonly action: string;
    readonly targetActorId: ActorId;
    readonly organizationId: OrganizationId;
    readonly scopeType: "competition";
    readonly scopeId: CompetitionId;
    readonly permission: null;
    readonly before: unknown;
    readonly after: unknown;
    readonly reason: string | null;
    readonly createdAt: Date;
  }): Promise<void>;
}

/** Supplied by the deployable because staff capabilities span bounded contexts. */
export interface CompetitionRoleCapabilityPort {
  permissionsForRole(role: CompetitionMembershipRole): readonly Permission[];
}

export class ChangeCompetitionMembershipRoleUseCase {
  constructor(
    private readonly deps: {
      readonly authorization: AuthorizationPort;
      readonly competitions: CompetitionRepository;
      readonly memberships: CompetitionMembershipRepository;
      readonly organizationMemberships: OrganizationMembershipReader;
      readonly audit: CompetitionRoleAuditPort;
      readonly clock: ClockPort;
      readonly ids: IdGeneratorPort;
      readonly transaction: TransactionPort;
      readonly roleCapabilities: CompetitionRoleCapabilityPort;
      readonly mutationLock: AuthorizationMutationLockPort;
    },
  ) {}

  async execute(input: {
    readonly actorId: ActorId;
    readonly organizationId: OrganizationId;
    readonly competitionId: CompetitionId;
    readonly targetActorId: ActorId;
    readonly role: CompetitionMembershipRole;
    readonly reason?: string;
  }): Promise<Result<CompetitionMembership, ChangeCompetitionMembershipRoleError>> {
    return this.deps.transaction.runInTransaction(() =>
      this.deps.mutationLock.runWithActors(
        input.organizationId,
        [input.actorId, input.targetActorId],
        () => this.executeLocked(input),
      ),
    );
  }

  private async executeLocked(input: {
    readonly actorId: ActorId;
    readonly organizationId: OrganizationId;
    readonly competitionId: CompetitionId;
    readonly targetActorId: ActorId;
    readonly role: CompetitionMembershipRole;
    readonly reason?: string;
  }): Promise<Result<CompetitionMembership, ChangeCompetitionMembershipRoleError>> {
    const scope = {
      organizationId: input.organizationId,
      competitionId: input.competitionId,
    };
    const decision = await this.deps.authorization.decide({
      actorId: input.actorId,
      permission: COMPETITION_PERMISSION.membershipsManage,
      scope,
    });
    if (!decision.allowed) {
      return err(
        new CompetitionAuthorizationForbidden({
          code: "authorization.forbidden",
          message: "Cannot manage competition roles",
          permission: COMPETITION_PERMISSION.membershipsManage,
        }),
      );
    }
    for (const permission of this.deps.roleCapabilities.permissionsForRole(input.role)) {
      const delegated = await this.deps.authorization.decide({
        actorId: input.actorId,
        permission,
        scope,
      });
      if (!delegated.allowed) {
        return err(
          new CompetitionAuthorizationForbidden({
            code: "authorization.forbidden",
            message: "Cannot assign a role with capabilities outside the actor's authority",
            permission,
          }),
        );
      }
    }
    if (!(await this.deps.competitions.findById(input.organizationId, input.competitionId))) {
      return err(
        new CompetitionNotFound({
          code: "competitions.not_found",
          message: "Competition not found",
        }),
      );
    }
    const membership = await this.deps.memberships.findByCompetitionAndActor(
      input.competitionId,
      input.targetActorId,
    );
    if (!membership || membership.organizationId !== input.organizationId) {
      return err(
        new CompetitionMembershipNotFound({
          code: "competitions.membership_not_found",
          message: "Competition membership not found",
        }),
      );
    }
    if (
      !(await this.deps.organizationMemberships.findByOrgAndActor(
        input.organizationId,
        input.targetActorId,
      ))
    ) {
      return err(
        new CompetitionMembershipNotFound({
          code: "competitions.membership_not_found",
          message: "Competition member is not a member of the owning organization",
        }),
      );
    }
    const updated = await this.deps.memberships.updateRole({
      ...membership,
      role: input.role,
    });
    await this.deps.audit.append({
      id: this.deps.ids.generate(),
      actorId: input.actorId,
      action: "authorization.competition-role.changed",
      targetActorId: input.targetActorId,
      organizationId: input.organizationId,
      scopeType: "competition",
      scopeId: input.competitionId,
      permission: null,
      before: membership,
      after: updated,
      reason: input.reason ?? null,
      createdAt: this.deps.clock.now(),
    });
    return ok(updated);
  }
}
