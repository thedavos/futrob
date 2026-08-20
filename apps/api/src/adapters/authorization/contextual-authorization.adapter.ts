import {
  COMPETITION_PERMISSIONS,
  COMPETITION_ROLE_PERMISSIONS,
  type CompetitionMembershipRepository,
  type CompetitionEntryRepository,
  type CompetitionRepository,
} from "@futrob/competitions";
import type {
  AccessGrantRepository,
  MembershipRepository,
  OrganizationRepository,
  PlatformRoleRepository,
} from "@futrob/organizations";
import {
  ORGANIZATION_PERMISSION,
  ORGANIZATION_PERMISSIONS,
  ORGANIZATION_ROLE_PERMISSIONS,
} from "@futrob/organizations";
import { RESULT_PERMISSIONS } from "@futrob/results";
import { ENCOUNTER_PERMISSION, ENCOUNTER_PERMISSIONS } from "@futrob/scheduling";
import { STATISTICS_PERMISSION, STATISTICS_PERMISSIONS } from "@futrob/statistics";
import type {
  ActorId,
  AuthorizationDecision,
  AuthorizationPort,
  AuthorizationScope,
  AuthorizationScopeType,
  EffectiveAccess,
  EffectiveRole,
  EncounterId,
  Permission,
} from "@futrob/shared-kernel";
import {
  ROSTER_ROLE_PERMISSIONS,
  TEAM_PERMISSIONS,
  type CompetitionRosterMembershipRepository,
  type CompetitionRosterMembership,
  type PlayerProfileRepository,
  type TeamRepository,
} from "@futrob/teams";

import type { EncounterScheduleSnapshot as EncounterAuthorizationSnapshot } from "@futrob/scheduling";

export interface EncounterAuthorizationReader {
  findById(encounterId: EncounterId): Promise<EncounterAuthorizationSnapshot | null>;
}

interface Layer {
  readonly scopeType: AuthorizationScopeType;
  readonly scopeId: string;
  readonly roles: readonly EffectiveRole[];
  readonly baseline: ReadonlySet<Permission>;
}

const ALL_PERMISSIONS = [
  ...ORGANIZATION_PERMISSIONS,
  ...COMPETITION_PERMISSIONS,
  ...TEAM_PERMISSIONS,
  ...ENCOUNTER_PERMISSIONS,
  ...RESULT_PERMISSIONS,
  ...STATISTICS_PERMISSIONS,
] satisfies readonly Permission[];

export function contextualOrganizationRolePermissions(
  role: keyof typeof ORGANIZATION_ROLE_PERMISSIONS,
): readonly Permission[] {
  if (role === "organizer") {
    return ALL_PERMISSIONS.filter(
      (permission) => permission !== ORGANIZATION_PERMISSION.superusersManage,
    );
  }
  if (role === "staff") {
    return [
      ...ORGANIZATION_ROLE_PERMISSIONS.staff,
      ...COMPETITION_PERMISSIONS,
      ...TEAM_PERMISSIONS,
      ...ENCOUNTER_PERMISSIONS,
      ...RESULT_PERMISSIONS,
      ...STATISTICS_PERMISSIONS,
    ];
  }
  return ORGANIZATION_ROLE_PERMISSIONS.member;
}

export function contextualCompetitionRolePermissions(
  role: keyof typeof COMPETITION_ROLE_PERMISSIONS,
): readonly Permission[] {
  return role === "staff"
    ? [
        ...COMPETITION_ROLE_PERMISSIONS.staff,
        ...TEAM_PERMISSIONS,
        ...ENCOUNTER_PERMISSIONS,
        ...RESULT_PERMISSIONS,
        ...STATISTICS_PERMISSIONS,
      ]
    : COMPETITION_ROLE_PERMISSIONS[role];
}

export class ContextualAuthorizationAdapter implements AuthorizationPort {
  constructor(
    private readonly deps: {
      readonly organizations: OrganizationRepository;
      readonly organizationMemberships: MembershipRepository;
      readonly competitionMemberships: CompetitionMembershipRepository;
      readonly competitions: CompetitionRepository;
      readonly entries: CompetitionEntryRepository;
      readonly teams: TeamRepository;
      readonly profiles: PlayerProfileRepository;
      readonly rosters: CompetitionRosterMembershipRepository;
      readonly grants: AccessGrantRepository;
      readonly platformRoles: PlatformRoleRepository;
      readonly encounters?: EncounterAuthorizationReader;
    },
  ) {}

  async decide(request: {
    readonly actorId: ActorId;
    readonly permission: Permission;
    readonly scope: AuthorizationScope;
  }): Promise<AuthorizationDecision> {
    const resolved = await this.resolveLayers(request.actorId, request.scope);
    if (!resolved.ok) {
      return {
        allowed: false,
        permission: request.permission,
        scope: request.scope,
        reason: resolved.reason,
      };
    }
    const grants = await this.deps.grants.listForActorAndScopes(
      request.actorId,
      request.scope.organizationId ?? null,
      resolved.layers.map(({ scopeType, scopeId }) => ({ scopeType, scopeId })),
    );
    const result = resolvePermission(request.permission, resolved.layers, grants);
    return {
      allowed: result.allowed,
      permission: request.permission,
      scope: request.scope,
      reason: result.assigned ? (result.allowed ? "allowed" : "denied") : "no-assignment",
    };
  }

  async getEffectiveAccess(input: {
    readonly actorId: ActorId;
    readonly scope: AuthorizationScope;
    readonly permissions?: readonly Permission[];
  }): Promise<EffectiveAccess> {
    const resolved = await this.resolveLayers(input.actorId, input.scope);
    const requested = uniquePermissions(input.permissions ?? ALL_PERMISSIONS);
    if (!resolved.ok) {
      return {
        actorId: input.actorId,
        scope: input.scope,
        roles: [],
        permissions: requested.map((permission) => ({
          permission,
          allowed: false,
          decidedAt: mostSpecificScope(input.scope),
        })),
      };
    }
    const grants = await this.deps.grants.listForActorAndScopes(
      input.actorId,
      input.scope.organizationId ?? null,
      resolved.layers.map(({ scopeType, scopeId }) => ({ scopeType, scopeId })),
    );
    return {
      actorId: input.actorId,
      scope: input.scope,
      roles: resolved.layers.flatMap((layer) => layer.roles),
      permissions: requested.map((permission) => {
        const result = resolvePermission(permission, resolved.layers, grants);
        return {
          permission,
          allowed: result.allowed,
          decidedAt: result.decidedAt,
        };
      }),
    };
  }

  private async resolveLayers(
    actorId: ActorId,
    scope: AuthorizationScope,
  ): Promise<
    | { readonly ok: true; readonly layers: readonly Layer[] }
    | { readonly ok: false; readonly reason: "scope-not-found" | "scope-mismatch" }
  > {
    if (scope.competitionId && !scope.organizationId)
      return { ok: false, reason: "scope-mismatch" };
    if (scope.teamId && !scope.organizationId) return { ok: false, reason: "scope-mismatch" };
    if (scope.encounterId && (!scope.organizationId || !scope.competitionId)) {
      return { ok: false, reason: "scope-mismatch" };
    }

    const layers: Layer[] = [];
    const superuser = await this.deps.platformRoles.findSuperuser(actorId);
    layers.push({
      scopeType: "platform",
      scopeId: "platform",
      roles: superuser ? [{ scopeType: "platform", scopeId: "platform", role: "superuser" }] : [],
      baseline: new Set(superuser ? ALL_PERMISSIONS : [STATISTICS_PERMISSION.readOwn]),
    });

    let organizationRole: string | null = null;
    let contextualRoster: CompetitionRosterMembership | null = null;
    if (scope.organizationId) {
      const organization = await this.deps.organizations.getById(scope.organizationId);
      if (!organization) return { ok: false, reason: "scope-not-found" };
      const membership = await this.deps.organizationMemberships.findByOrgAndActor(
        scope.organizationId,
        actorId,
      );
      organizationRole = membership?.role ?? null;
      const baseline = new Set<Permission>(
        membership ? contextualOrganizationRolePermissions(membership.role) : [],
      );
      layers.push({
        scopeType: "organization",
        scopeId: scope.organizationId,
        roles: membership
          ? [
              {
                scopeType: "organization",
                scopeId: scope.organizationId,
                role: membership.role,
              },
            ]
          : [],
        baseline,
      });
    }

    if (scope.competitionId && scope.organizationId) {
      const competition = await this.deps.competitions.findById(
        scope.organizationId,
        scope.competitionId,
      );
      if (!competition) return { ok: false, reason: "scope-not-found" };
      const membership = await this.deps.competitionMemberships.findByCompetitionAndActor(
        scope.competitionId,
        actorId,
      );
      const baseline = new Set<Permission>(
        membership ? COMPETITION_ROLE_PERMISSIONS[membership.role] : [],
      );
      if (!membership) {
        contextualRoster = await this.findRoster(actorId, scope, null);
        if (contextualRoster) {
          const contextualRole =
            contextualRoster.role === "vice_captain" ? "captain" : contextualRoster.role;
          for (const permission of COMPETITION_ROLE_PERMISSIONS[contextualRole]) {
            baseline.add(permission);
          }
        }
      }
      if (membership) {
        for (const permission of contextualCompetitionRolePermissions(membership.role)) {
          baseline.add(permission);
        }
      }
      layers.push({
        scopeType: "competition",
        scopeId: scope.competitionId,
        roles: membership
          ? [
              {
                scopeType: "competition",
                scopeId: scope.competitionId,
                role: membership.role,
              },
            ]
          : contextualRoster
            ? [
                {
                  scopeType: "team",
                  scopeId: contextualRoster.teamId,
                  role: contextualRoster.role,
                },
              ]
            : [],
        baseline,
      });
    }

    let encounter: EncounterAuthorizationSnapshot | null = null;
    if (scope.encounterId) {
      encounter = (await this.deps.encounters?.findById(scope.encounterId)) ?? null;
      if (!encounter) return { ok: false, reason: "scope-not-found" };
      if (
        encounter.organizationId !== scope.organizationId ||
        encounter.competitionId !== scope.competitionId
      ) {
        return { ok: false, reason: "scope-mismatch" };
      }
      if (
        scope.teamId &&
        scope.teamId !== encounter.homeTeamId &&
        scope.teamId !== encounter.awayTeamId
      ) {
        return { ok: false, reason: "scope-mismatch" };
      }
    }

    const roster =
      scope.teamId || encounter
        ? await this.findRoster(actorId, scope, encounter)
        : contextualRoster;
    if (scope.teamId && scope.organizationId) {
      const team = await this.deps.teams.findById(scope.organizationId, scope.teamId);
      if (!team) return { ok: false, reason: "scope-not-found" };
      let rosterPermissions = roster ? ROSTER_ROLE_PERMISSIONS[roster.role] : [];
      if (scope.competitionId) {
        const entry = await this.deps.entries.findByCompetitionAndTeam(
          scope.organizationId,
          scope.competitionId,
          scope.teamId,
        );
        if (!entry) {
          return { ok: false, reason: "scope-mismatch" };
        }
        if (entry.status === "rejected" && roster) {
          rosterPermissions = ROSTER_ROLE_PERMISSIONS.player;
        }
      }
      layers.push({
        scopeType: "team",
        scopeId: scope.teamId,
        roles: roster ? [{ scopeType: "team", scopeId: scope.teamId, role: roster.role }] : [],
        baseline: new Set(rosterPermissions),
      });
    }

    if (scope.encounterId) {
      const baseline = new Set<Permission>();
      const approvedEntry =
        roster && scope.organizationId && scope.competitionId
          ? await this.deps.entries.findByCompetitionAndTeam(
              scope.organizationId,
              scope.competitionId,
              roster.teamId,
            )
          : null;
      const eligibleRoster = approvedEntry?.status === "approved" ? roster : null;
      if (eligibleRoster?.role === "captain" || eligibleRoster?.role === "vice_captain") {
        baseline.add(ENCOUNTER_PERMISSION.read);
        baseline.add(ENCOUNTER_PERMISSION.rescheduleRequest);
        baseline.add("encounters.official-selection.propose");
        baseline.add("encounters.official-selection.resolve");
      } else if (eligibleRoster?.role === "player") {
        baseline.add(ENCOUNTER_PERMISSION.read);
      }
      layers.push({
        scopeType: "encounter",
        scopeId: scope.encounterId,
        roles: [],
        baseline,
      });
    }

    void organizationRole;
    return { ok: true, layers };
  }

  private async findRoster(
    actorId: ActorId,
    scope: AuthorizationScope,
    encounter: EncounterAuthorizationSnapshot | null,
  ) {
    const profile = await this.deps.profiles.findByActor(actorId);
    if (!profile) return null;
    if (scope.teamId && scope.competitionId) {
      const membership = await this.deps.rosters.findByTeamPlayerCompetition(
        scope.teamId,
        profile.id,
        scope.competitionId,
      );
      return membership?.organizationId === scope.organizationId ? membership : null;
    }
    const memberships = await this.deps.rosters.listByPlayerProfile(profile.id);
    return (
      memberships.find((membership) => {
        if (membership.organizationId !== scope.organizationId) return false;
        if (scope.competitionId && membership.competitionId !== scope.competitionId) return false;
        if (scope.teamId && membership.teamId !== scope.teamId) return false;
        if (
          encounter &&
          membership.teamId !== encounter.homeTeamId &&
          membership.teamId !== encounter.awayTeamId
        ) {
          return false;
        }
        return true;
      }) ?? null
    );
  }
}

function resolvePermission(
  permission: Permission,
  layers: readonly Layer[],
  grants: readonly {
    readonly permission: Permission;
    readonly effect: "allow" | "deny";
    readonly scopeType: AuthorizationScopeType;
    readonly scopeId: string;
  }[],
) {
  let allowed = false;
  let assigned = false;
  let decidedAt: AuthorizationScopeType = "platform";
  for (const layer of layers) {
    const matching = grants.filter(
      (grant) =>
        grant.permission === permission &&
        grant.scopeType === layer.scopeType &&
        grant.scopeId === layer.scopeId,
    );
    if (matching.some((grant) => grant.effect === "deny")) {
      allowed = false;
      assigned = true;
      decidedAt = layer.scopeType;
      continue;
    }
    if (matching.some((grant) => grant.effect === "allow")) {
      allowed = true;
      assigned = true;
      decidedAt = layer.scopeType;
      continue;
    }
    if (layer.baseline.has(permission)) {
      allowed = true;
      assigned = true;
      decidedAt = layer.scopeType;
    }
  }
  return { allowed, assigned, decidedAt } satisfies {
    readonly allowed: boolean;
    readonly assigned: boolean;
    readonly decidedAt: AuthorizationScopeType;
  };
}

function uniquePermissions(permissions: readonly Permission[]): readonly Permission[] {
  return [...new Set(permissions)].sort();
}

function mostSpecificScope(scope: AuthorizationScope): AuthorizationScopeType {
  if (scope.encounterId) return "encounter";
  if (scope.teamId) return "team";
  if (scope.competitionId) return "competition";
  if (scope.organizationId) return "organization";
  return "platform";
}
