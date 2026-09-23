import type { EffectiveAccessDto, PermissionDto } from "@futrob/api-contracts";

/** DTO permission strings — not @futrob/organizations (AC-MOB-003). */
export const MOBILE_PERMISSION = {
  organizationsRead: "organizations.read",
  organizationsUpdate: "organizations.update",
  organizationsMembershipsRead: "organizations.memberships.read",
  organizationsInvitationsManage: "organizations.invitations.manage",
  organizationsRolesManage: "authorization.roles.manage",
  competitionsRead: "competitions.read",
  competitionsUpdate: "competitions.update",
  competitionsPublish: "competitions.publish",
  competitionsParticipantsRead: "competitions.participants.read",
  teamsRead: "teams.read",
  teamsCreate: "teams.create",
  teamsRosterRead: "teams.roster.read",
  teamsRosterManage: "teams.roster.manage",
  teamsRosterRolesManage: "teams.roster.roles.manage",
  teamsInvitationsManage: "teams.roster.invitations.manage",
  teamsExternalClubRead: "teams.external-club.read",
  teamsExternalClubManage: "teams.external-club.manage",
} as const satisfies Record<string, PermissionDto>;

export const SHELL_PERMISSIONS = [
  MOBILE_PERMISSION.organizationsRead,
  MOBILE_PERMISSION.organizationsUpdate,
  MOBILE_PERMISSION.organizationsMembershipsRead,
  MOBILE_PERMISSION.organizationsInvitationsManage,
  MOBILE_PERMISSION.organizationsRolesManage,
  MOBILE_PERMISSION.competitionsRead,
  MOBILE_PERMISSION.competitionsUpdate,
  MOBILE_PERMISSION.competitionsPublish,
  MOBILE_PERMISSION.competitionsParticipantsRead,
  MOBILE_PERMISSION.teamsRead,
  MOBILE_PERMISSION.teamsCreate,
  MOBILE_PERMISSION.teamsRosterRead,
  MOBILE_PERMISSION.teamsRosterManage,
  MOBILE_PERMISSION.teamsRosterRolesManage,
  MOBILE_PERMISSION.teamsInvitationsManage,
  MOBILE_PERMISSION.teamsExternalClubRead,
  MOBILE_PERMISSION.teamsExternalClubManage,
] as const satisfies readonly PermissionDto[];

export function scopeForDestination(
  destination:
    | { readonly kind: "player" | "picker" }
    | { readonly kind: "organization"; readonly organizationId: string }
    | {
        readonly kind: "competition";
        readonly organizationId: string;
        readonly competitionId: string;
      },
) {
  if (destination.kind === "organization") return { organizationId: destination.organizationId };
  if (destination.kind === "competition")
    return {
      organizationId: destination.organizationId,
      competitionId: destination.competitionId,
    };
  return {};
}

export class EffectiveAccessHttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`effective-access:${status}`);
    this.name = "EffectiveAccessHttpError";
    this.status = status;
  }
}

export type CapabilityState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly allowed: ReadonlySet<string> }
  | { readonly status: "unavailable" };

export interface PermissionGatedItem {
  readonly id: string;
  readonly label: string;
  readonly requiredPermission?: PermissionDto;
}

export function allowedPermissionSet(
  access: EffectiveAccessDto | null | undefined,
): ReadonlySet<string> {
  return new Set(
    access?.permissions
      .filter((permission) => permission.allowed)
      .map((permission) => permission.permission) ?? [],
  );
}

export function capabilityStateFromQuery(input: {
  readonly fetchStatus: "pending" | "error" | "success";
  readonly data: EffectiveAccessDto | undefined;
}): CapabilityState {
  if (input.fetchStatus === "error") return { status: "unavailable" };
  if (input.fetchStatus === "pending" && input.data === undefined) return { status: "loading" };
  return { status: "ready", allowed: allowedPermissionSet(input.data) };
}

export function allowedFromCapabilityState(state: CapabilityState): ReadonlySet<string> {
  return state.status === "ready" ? state.allowed : new Set();
}

export function filterByPermission<T extends PermissionGatedItem>(
  items: readonly T[],
  allowedPermissions: ReadonlySet<string> | undefined,
): readonly T[] {
  return items.filter(
    (item) => !item.requiredPermission || allowedPermissions?.has(item.requiredPermission) === true,
  );
}

export const PERSONAL_NAV = [
  { id: "home", label: "Inicio" },
] as const satisfies readonly PermissionGatedItem[];

export const ORG_TABS = [
  {
    id: "home",
    label: "Inicio",
    requiredPermission: MOBILE_PERMISSION.organizationsRead,
  },
  {
    id: "competitions",
    label: "Competiciones",
    requiredPermission: MOBILE_PERMISSION.competitionsRead,
  },
  {
    id: "teams",
    label: "Equipos",
    requiredPermission: MOBILE_PERMISSION.teamsRead,
  },
  {
    id: "players",
    label: "Jugadores",
    requiredPermission: MOBILE_PERMISSION.organizationsMembershipsRead,
  },
  {
    id: "invitations",
    label: "Invitaciones",
    requiredPermission: MOBILE_PERMISSION.organizationsInvitationsManage,
  },
  {
    id: "organization",
    label: "Organización",
    requiredPermission: MOBILE_PERMISSION.organizationsRolesManage,
  },
  {
    id: "settings",
    label: "Ajustes",
    requiredPermission: MOBILE_PERMISSION.organizationsUpdate,
  },
] as const satisfies readonly PermissionGatedItem[];

export const ORG_COMMANDS = [
  {
    id: "new-competition",
    label: "Nueva competición",
    requiredPermission: MOBILE_PERMISSION.competitionsUpdate,
  },
] as const satisfies readonly PermissionGatedItem[];

export function orgTabsForAccess(
  allowedPermissions: ReadonlySet<string>,
): readonly PermissionGatedItem[] {
  return filterByPermission(ORG_TABS, allowedPermissions);
}

export type ShellCatalogItem = {
  readonly id: string;
  readonly label: string;
};

export type ShellAccessPresentation = {
  readonly nav: readonly ShellCatalogItem[];
  readonly commands: readonly ShellCatalogItem[];
  readonly accessRetryable: boolean;
};

export function presentShellAccess(input: {
  readonly organizationId: string | undefined;
  readonly capability: CapabilityState;
}): ShellAccessPresentation {
  const allowed = allowedFromCapabilityState(input.capability);
  const navCatalog: readonly PermissionGatedItem[] = input.organizationId ? ORG_TABS : PERSONAL_NAV;
  const commandCatalog: readonly PermissionGatedItem[] = input.organizationId ? ORG_COMMANDS : [];
  return {
    nav: filterByPermission(navCatalog, allowed).map(({ id, label }) => ({ id, label })),
    commands: filterByPermission(commandCatalog, allowed).map(({ id, label }) => ({ id, label })),
    accessRetryable: input.capability.status === "unavailable",
  };
}
