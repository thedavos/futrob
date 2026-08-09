import { WORKSPACE_SELECTION_KIND, type WorkspaceSelection } from "./workspace-selection.ts";

export const NAV_SECTION = {
  general: "general",
  context: "context",
  account: "account",
} as const;

export type NavSectionId = (typeof NAV_SECTION)[keyof typeof NAV_SECTION];

export type ShellNavIconId =
  | "home"
  | "competitions"
  | "ea-clubs"
  | "pro-stats"
  | "invitations"
  | "teams"
  | "players"
  | "organization"
  | "settings";

export type ShellNavItem = {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly icon?: ShellNavIconId;
  readonly stub?: boolean;
  readonly requiredPermission?: string;
};

export type ShellNavSection = {
  readonly id: NavSectionId;
  readonly label: string;
  readonly items: readonly ShellNavItem[];
};

function personalGeneralNav(): readonly ShellNavItem[] {
  return [
    { id: "home", label: "Inicio", href: "/player", icon: "home" },
    {
      id: "competitions",
      label: "Competiciones",
      href: "/player/competitions",
      icon: "competitions",
    },
    { id: "ea-clubs", label: "Clubes EA", href: "/player/ea-clubs", icon: "ea-clubs" },
    {
      id: "pro-stats",
      label: "Pro Stats",
      href: "/player/pro-stats",
      icon: "pro-stats",
      stub: true,
    },
    { id: "invitations", label: "Invitaciones", href: "/invitations/accept", icon: "invitations" },
  ];
}

function organizationGeneralNav(organizationId: string): readonly ShellNavItem[] {
  const base = `/orgs/${organizationId}`;
  return [
    {
      id: "home",
      label: "Inicio",
      href: base,
      icon: "home",
      requiredPermission: "organizations.read",
    },
    {
      id: "competitions",
      label: "Competiciones",
      href: `${base}/competitions`,
      icon: "competitions",
      requiredPermission: "competitions.read",
    },
    {
      id: "teams",
      label: "Equipos",
      href: `${base}/teams`,
      icon: "teams",
      stub: true,
      requiredPermission: "teams.read",
    },
    {
      id: "players",
      label: "Jugadores",
      href: `${base}/players`,
      icon: "players",
      stub: true,
      requiredPermission: "organizations.memberships.read",
    },
    {
      id: "invitations",
      label: "Invitaciones",
      href: `${base}/invitations`,
      icon: "invitations",
      stub: true,
      requiredPermission: "organizations.invitations.manage",
    },
    {
      id: "organization",
      label: "Organización",
      href: `${base}/settings/members`,
      icon: "organization",
      stub: true,
      requiredPermission: "authorization.roles.manage",
    },
    {
      id: "settings",
      label: "Ajustes",
      href: `${base}/settings`,
      icon: "settings",
      stub: true,
      requiredPermission: "organizations.update",
    },
  ];
}

function personalCompetitionContext(
  organizationId: string | null,
  competitionId: string,
): readonly ShellNavItem[] {
  const base = organizationId
    ? `/orgs/${organizationId}/competitions/${competitionId}`
    : `/player/competitions/${competitionId}`;
  return [
    { id: "overview", label: "Resumen", href: base, stub: true },
    { id: "matches", label: "Partidos", href: `${base}/matches`, stub: true },
    { id: "stats", label: "Estadísticas", href: `${base}/stats`, stub: true },
    { id: "team", label: "Mi equipo", href: `${base}/team`, stub: true },
  ];
}

function organizationCompetitionContext(
  organizationId: string,
  competitionId: string,
): readonly ShellNavItem[] {
  const base = `/orgs/${organizationId}/competitions/${competitionId}`;
  return [
    { id: "overview", label: "Resumen", href: base, requiredPermission: "competitions.read" },
    {
      id: "fixture",
      label: "Calendario",
      href: `${base}/fixture`,
      stub: true,
      requiredPermission: "competitions.read",
    },
    {
      id: "encounters",
      label: "Enfrentamientos",
      href: `${base}/encounters`,
      stub: true,
      requiredPermission: "competitions.read",
    },
    {
      id: "standings",
      label: "Clasificación",
      href: `${base}/standings`,
      stub: true,
      requiredPermission: "competitions.read",
    },
    {
      id: "bracket",
      label: "Bracket",
      href: `${base}/bracket`,
      stub: true,
      requiredPermission: "competitions.read",
    },
    {
      id: "rankings",
      label: "Rankings",
      href: `${base}/rankings`,
      stub: true,
      requiredPermission: "competitions.read",
    },
    {
      id: "teams",
      label: "Equipos",
      href: `${base}/teams`,
      stub: true,
      requiredPermission: "teams.read",
    },
    {
      id: "disputes",
      label: "Disputas",
      href: `${base}/disputes`,
      stub: true,
      requiredPermission: "competitions.read",
    },
    {
      id: "analytics",
      label: "Analíticas",
      href: `${base}/analytics`,
      stub: true,
      requiredPermission: "competitions.read",
    },
    {
      id: "rules",
      label: "Reglamento",
      href: `${base}/rules`,
      stub: true,
      requiredPermission: "competitions.read",
    },
  ];
}

export function generalNavFor(
  selection: WorkspaceSelection,
  allowedPermissions?: ReadonlySet<string>,
): ShellNavSection {
  if (selection.kind === WORKSPACE_SELECTION_KIND.organization) {
    return {
      id: NAV_SECTION.general,
      label: "General",
      items: filterByPermission(
        organizationGeneralNav(selection.organizationId),
        allowedPermissions,
      ),
    };
  }

  return {
    id: NAV_SECTION.general,
    label: "General",
    items: personalGeneralNav(),
  };
}

export function contextNavFor(
  selection: WorkspaceSelection,
  allowedPermissions?: ReadonlySet<string>,
): ShellNavSection {
  if (selection.kind === WORKSPACE_SELECTION_KIND.competition) {
    const isOrgOperator =
      selection.organizationId != null && allowedPermissions?.has("competitions.update") === true;
    const items = isOrgOperator
      ? organizationCompetitionContext(selection.organizationId!, selection.competitionId)
      : personalCompetitionContext(selection.organizationId, selection.competitionId);

    return {
      id: NAV_SECTION.context,
      label: "Contexto activo",
      items: filterByPermission(items, allowedPermissions),
    };
  }

  return {
    id: NAV_SECTION.context,
    label: "Contexto activo",
    items: [],
  };
}

function filterByPermission(
  items: readonly ShellNavItem[],
  allowedPermissions: ReadonlySet<string> | undefined,
): readonly ShellNavItem[] {
  if (!allowedPermissions) return items;
  return items.filter(
    (item) => !item.requiredPermission || allowedPermissions.has(item.requiredPermission),
  );
}

export function accountNavItems(): readonly ShellNavItem[] {
  return [
    { id: "profile", label: "Perfil", href: "/player/profile", stub: true },
    { id: "feedback", label: "Enviar feedback", href: "/feedback", stub: true },
    { id: "contact", label: "Contáctanos", href: "/contact", stub: true },
    { id: "settings", label: "Configuración", href: "/settings", stub: true },
  ];
}

export function isNavItemActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href !== "/" && pathname.startsWith(`${href}/`)) return true;
  return false;
}

/** Among sibling items that match the path, prefer the longest (most specific) href. */
export function resolveActiveNavHref(
  pathname: string,
  items: readonly ShellNavItem[],
): string | null {
  let best: string | null = null;
  for (const item of items) {
    if (!isNavItemActive(pathname, item.href)) continue;
    if (best === null || item.href.length > best.length) {
      best = item.href;
    }
  }
  return best;
}
