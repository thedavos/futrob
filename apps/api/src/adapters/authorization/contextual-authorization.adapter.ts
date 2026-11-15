import { COMPETITION_ROLE_PERMISSIONS } from "@futrob/competitions";
import { ENCOUNTER_PERMISSION } from "@futrob/scheduling";
import { STATISTICS_PERMISSION } from "@futrob/statistics";
import type {
  ActorId,
  AuthorizationBatchPort,
  AuthorizationDecision,
  AuthorizationPort,
  AuthorizationScope,
  EffectiveAccess,
  OrganizationId,
  Permission,
} from "@futrob/shared-kernel";
import { Panic } from "@futrob/shared-kernel";
import { ROSTER_ROLE_PERMISSIONS, type CompetitionRosterMembership } from "@futrob/teams";
import type { EncounterScheduleSnapshot as EncounterAuthorizationSnapshot } from "@futrob/scheduling";

import {
  ALL_PERMISSIONS,
  contextualCompetitionRolePermissions,
  contextualOrganizationRolePermissions,
} from "./contextual-role-permissions.ts";
import {
  mostSpecificScope,
  resolvePermission,
  uniquePermissions,
  type Layer,
} from "./contextual-resolution.ts";
import {
  layerSources,
  type AuthorizationSources,
  type LayerSources,
} from "./contextual-sources.ts";

export type { EncounterAuthorizationReader } from "./contextual-sources.ts";
export {
  ALL_PERMISSIONS,
  contextualCompetitionRolePermissions,
  contextualOrganizationRolePermissions,
} from "./contextual-role-permissions.ts";

type ResolvedLayers =
  | { readonly ok: true; readonly layers: readonly Layer[] }
  | { readonly ok: false; readonly reason: "scope-not-found" | "scope-mismatch" };

export class ContextualAuthorizationAdapter implements AuthorizationPort, AuthorizationBatchPort {
  constructor(private readonly deps: AuthorizationSources) {}

  async decide(request: {
    readonly actorId: ActorId;
    readonly permission: Permission;
    readonly scope: AuthorizationScope;
  }): Promise<AuthorizationDecision> {
    const [decision] = await this.decideEach({
      actorId: request.actorId,
      permission: request.permission,
      scopes: [request.scope],
    });
    if (!decision) throw new Panic("decideEach returned no decision for one scope");
    return decision;
  }

  async decideEach(input: {
    readonly actorId: ActorId;
    readonly permission: Permission;
    readonly scopes: readonly AuthorizationScope[];
  }): Promise<readonly AuthorizationDecision[]> {
    if (input.scopes.length === 0) return [];
    const sources = await this.sourcesFor(input.scopes);
    const resolved = await Promise.all(
      input.scopes.map((scope) => this.resolveLayers(input.actorId, scope, sources)),
    );
    const grants = await this.grantsFor(input.actorId, input.scopes, resolved);
    return input.scopes.map((scope, index): AuthorizationDecision => {
      const layers = resolved[index];
      if (!layers?.ok) {
        return {
          allowed: false,
          permission: input.permission,
          scope,
          reason: layers?.reason ?? "scope-not-found",
        };
      }
      const result = resolvePermission(
        input.permission,
        layers.layers,
        grants.get(scope.organizationId ?? null) ?? [],
      );
      return {
        allowed: result.allowed,
        permission: input.permission,
        scope,
        reason: result.assigned ? (result.allowed ? "allowed" : "denied") : "no-assignment",
      };
    });
  }

  async getEffectiveAccess(input: {
    readonly actorId: ActorId;
    readonly scope: AuthorizationScope;
    readonly permissions?: readonly Permission[];
  }): Promise<EffectiveAccess> {
    const resolved = await this.resolveLayers(
      input.actorId,
      input.scope,
      await this.sourcesFor([input.scope]),
    );
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

  /** Request-scoped reads: scopes sharing ancestors load them, and their Encounters, once. */
  private async sourcesFor(scopes: readonly AuthorizationScope[]): Promise<LayerSources> {
    const encounterIds = [
      ...new Set(scopes.flatMap((scope) => (scope.encounterId ? [scope.encounterId] : []))),
    ];
    const snapshots =
      encounterIds.length > 1 && this.deps.encounters
        ? new Map(
            (await this.deps.encounters.findByIds(encounterIds)).map(
              (snapshot) => [snapshot.encounterId, snapshot] as const,
            ),
          )
        : null;
    return layerSources(this.deps, snapshots);
  }

  /** One grants read per organization, covering every layer of every resolved scope. */
  private async grantsFor(
    actorId: ActorId,
    scopes: readonly AuthorizationScope[],
    resolved: readonly ResolvedLayers[],
  ) {
    const layersByOrganization = new Map<OrganizationId | null, Map<string, Layer>>();
    scopes.forEach((scope, index) => {
      const entry = resolved[index];
      if (!entry?.ok) return;
      const organizationId = scope.organizationId ?? null;
      const layers = layersByOrganization.get(organizationId) ?? new Map<string, Layer>();
      for (const layer of entry.layers) layers.set(`${layer.scopeType}:${layer.scopeId}`, layer);
      layersByOrganization.set(organizationId, layers);
    });
    const grants = await Promise.all(
      [...layersByOrganization].map(
        async ([organizationId, layers]) =>
          [
            organizationId,
            await this.deps.grants.listForActorAndScopes(
              actorId,
              organizationId,
              [...layers.values()].map(({ scopeType, scopeId }) => ({ scopeType, scopeId })),
            ),
          ] as const,
      ),
    );
    return new Map(grants);
  }

  private async resolveLayers(
    actorId: ActorId,
    scope: AuthorizationScope,
    sources: LayerSources,
  ): Promise<ResolvedLayers> {
    if (scope.competitionId && !scope.organizationId)
      return { ok: false, reason: "scope-mismatch" };
    if (scope.teamId && !scope.organizationId) return { ok: false, reason: "scope-mismatch" };
    if (scope.encounterId && (!scope.organizationId || !scope.competitionId)) {
      return { ok: false, reason: "scope-mismatch" };
    }

    const layers: Layer[] = [];
    const superuser = await sources.superuser(actorId);
    layers.push({
      scopeType: "platform",
      scopeId: "platform",
      roles: superuser ? [{ scopeType: "platform", scopeId: "platform", role: "superuser" }] : [],
      baseline: new Set(superuser ? ALL_PERMISSIONS : [STATISTICS_PERMISSION.readOwn]),
    });

    let contextualRoster: CompetitionRosterMembership | null = null;
    if (scope.organizationId) {
      const organization = await sources.organization(scope.organizationId);
      if (!organization) return { ok: false, reason: "scope-not-found" };
      const membership = await sources.organizationMembership(scope.organizationId, actorId);
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
      const competition = await sources.competition(scope.organizationId, scope.competitionId);
      if (!competition) return { ok: false, reason: "scope-not-found" };
      const membership = await sources.competitionMembership(scope.competitionId, actorId);
      const baseline = new Set<Permission>(
        membership ? COMPETITION_ROLE_PERMISSIONS[membership.role] : [],
      );
      if (!membership) {
        contextualRoster = await this.findRoster(actorId, scope, null, sources);
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
      encounter = await sources.encounter(scope.encounterId);
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
        ? await this.findRoster(actorId, scope, encounter, sources)
        : contextualRoster;
    if (scope.teamId && scope.organizationId) {
      const team = await sources.team(scope.organizationId, scope.teamId);
      if (!team) return { ok: false, reason: "scope-not-found" };
      let rosterPermissions = roster ? ROSTER_ROLE_PERMISSIONS[roster.role] : [];
      if (scope.competitionId) {
        const entry = await sources.entry(scope.organizationId, scope.competitionId, scope.teamId);
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
          ? await sources.entry(scope.organizationId, scope.competitionId, roster.teamId)
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

    return { ok: true, layers };
  }

  private async findRoster(
    actorId: ActorId,
    scope: AuthorizationScope,
    encounter: EncounterAuthorizationSnapshot | null,
    sources: LayerSources,
  ) {
    const profile = await sources.profile(actorId);
    if (!profile) return null;
    if (scope.teamId && scope.competitionId) {
      const membership = await sources.rosterOnTeam(scope.teamId, profile.id, scope.competitionId);
      return membership?.organizationId === scope.organizationId ? membership : null;
    }
    const memberships = await sources.rostersOfProfile(profile.id);
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
