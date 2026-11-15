import type { ActorContactReader } from "@futrob/identity";
import {
  err,
  ok,
  type ActorId,
  type AuthorizationPort,
  type OrganizationId,
  type Result,
} from "@futrob/shared-kernel";
import type { OrganizationMemberRecord } from "../../domain/entities/organization-member-record.ts";
import {
  OrganizationMemberDirectoryLimitReached,
  type ListOrganizationMembersError,
} from "../../domain/errors/organization-member.errors.ts";
import type {
  AuthorizationForbidden,
  AuthorizationScopeNotFound,
} from "../../domain/errors/authorization.errors.ts";
import { ORGANIZATION_PERMISSION } from "../../domain/policies/organization-permissions.ts";
import { MEMBER_DIRECTORY_MEMBER_LIMIT } from "../../domain/policies/member-directory-limits.ts";
import type { OrganizationMemberAccessSummarizer } from "../../domain/ports/organization-member-access.summarizer.ts";
import type { MembershipRepository } from "../../domain/ports/membership.repository.ts";
import { RequirePermissionUseCase } from "../require-permission/require-permission.use-case.ts";

export interface ListOrganizationMembersInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
}

export interface ListOrganizationMembersResult {
  readonly members: readonly OrganizationMemberRecord[];
}

export class ListOrganizationMembersUseCase {
  private readonly permissions: RequirePermissionUseCase;

  constructor(
    private readonly deps: {
      readonly authorization: AuthorizationPort;
      readonly memberships: MembershipRepository;
      readonly contacts: ActorContactReader;
      readonly access: OrganizationMemberAccessSummarizer;
    },
  ) {
    this.permissions = new RequirePermissionUseCase(deps.authorization);
  }

  async execute(
    input: ListOrganizationMembersInput,
  ): Promise<
    Result<
      ListOrganizationMembersResult,
      ListOrganizationMembersError | AuthorizationForbidden | AuthorizationScopeNotFound
    >
  > {
    const permission = await this.permissions.execute({
      actorId: input.actorId,
      permission: ORGANIZATION_PERMISSION.membershipsRead,
      scope: { organizationId: input.organizationId },
    });
    if (!permission.isOk()) return permission;

    const rows = await this.deps.memberships.listByOrganization(
      input.organizationId,
      MEMBER_DIRECTORY_MEMBER_LIMIT + 1,
    );
    if (rows.length > MEMBER_DIRECTORY_MEMBER_LIMIT) {
      return err(
        new OrganizationMemberDirectoryLimitReached({
          code: "organizations.member_directory_limit_reached",
          message: "The organization has more members than the directory can return",
        }),
      );
    }
    if (rows.length === 0) return ok({ members: [] });

    const access = await this.deps.access.summarize({
      organizationId: input.organizationId,
      callerId: input.actorId,
      members: rows,
    });
    if (!access.isOk()) return access;

    const contacts = await this.deps.contacts.listByActorIds(rows.map((row) => row.actorId));
    const contactByActor = new Map(contacts.map((contact) => [contact.actorId, contact]));
    return ok({
      members: rows.map((row) => {
        const contact = contactByActor.get(row.actorId);
        return {
          actorId: row.actorId,
          displayName: contact?.displayName ?? null,
          email: contact?.email ?? null,
          role: row.role,
          joinedAt: row.createdAt,
          access: access.value.get(row.actorId) ?? { kind: "none" },
        };
      }),
    });
  }
}
