import type { Permission } from "@futrob/shared-kernel";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { ORGANIZATION_PERMISSION } from "@futrob/organizations";
import { TEAM_PERMISSION } from "@futrob/teams";
import { createTranslator, type Translator } from "@/shared/presentation/i18n/translate.ts";
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
  | "matches"
  | "statistics"
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
  readonly requiredPermission?: Permission;
};

export type ShellNavSection = {
  readonly id: NavSectionId;
  readonly label: string;
  readonly items: readonly ShellNavItem[];
};

function personalGeneralNav(t: Translator): readonly ShellNavItem[] {
  return [
    { id: "home", label: "Inicio", href: "/player", icon: "home" },
    {
      id: "competitions",
      label: "Competiciones",
      href: "/player/competitions",
      icon: "competitions",
    },
    {
      id: "game-accounts",
      label: t("player.nav.gameData"),
      href: "/player/game-accounts",
      icon: "ea-clubs",
    },
    { id: "matches", label: t("player.nav.matches"), href: "/player/matches", icon: "matches" },
    {
      id: "statistics",
      label: t("player.nav.statistics"),
      href: "/player/statistics",
      icon: "statistics",
    },
    { id: "invitations", label: "Invitaciones", href: "/invitations", icon: "invitations" },
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
      requiredPermission: ORGANIZATION_PERMISSION.read,
    },
    {
      id: "competitions",
      label: "Competiciones",
      href: `${base}/competitions`,
      icon: "competitions",
      requiredPermission: COMPETITION_PERMISSION.read,
    },
    {
      id: "teams",
      label: "Equipos",
      href: `${base}/teams`,
      icon: "teams",
      requiredPermission: TEAM_PERMISSION.read,
    },
    {
      id: "players",
      label: "Jugadores",
      href: `${base}/players`,
      icon: "players",
      // The page lists who plays on each roster, so it follows roster access.
      requiredPermission: TEAM_PERMISSION.rosterRead,
    },
    {
      id: "invitations",
      label: "Invitaciones",
      href: `${base}/invitations`,
      icon: "invitations",
      requiredPermission: ORGANIZATION_PERMISSION.invitationsManage,
    },
    {
      id: "organization",
      label: "Organización",
      href: `${base}/settings/members`,
      icon: "organization",
      requiredPermission: ORGANIZATION_PERMISSION.rolesManage,
    },
    {
      id: "settings",
      label: "Ajustes",
      href: `${base}/settings`,
      icon: "settings",
      requiredPermission: ORGANIZATION_PERMISSION.update,
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
    { id: "overview", label: "Resumen", href: base },
    { id: "matches", label: "Partidos", href: `${base}/matches` },
    { id: "stats", label: "Estadísticas", href: `${base}/stats` },
    {
      id: "team",
      label: "Mi equipo",
      href: `${base}/team`,
      requiredPermission: TEAM_PERMISSION.read,
    },
    {
      id: "roster",
      label: "Plantilla",
      href: `${base}/team/roster`,
      requiredPermission: TEAM_PERMISSION.rosterManage,
    },
    {
      id: "team-invitations",
      label: "Invitaciones del equipo",
      href: `${base}/team/invitations`,
      requiredPermission: TEAM_PERMISSION.invitationsManage,
    },
  ];
}

function organizationCompetitionContext(
  organizationId: string,
  competitionId: string,
): readonly ShellNavItem[] {
  const base = `/orgs/${organizationId}/competitions/${competitionId}`;
  return [
    {
      id: "overview",
      label: "Resumen",
      href: base,
      requiredPermission: COMPETITION_PERMISSION.read,
    },
    {
      id: "fixture",
      label: "Calendario",
      href: `${base}/fixture`,
      requiredPermission: COMPETITION_PERMISSION.read,
    },
    {
      id: "encounters",
      label: "Enfrentamientos",
      href: `${base}/encounters`,
      requiredPermission: COMPETITION_PERMISSION.read,
    },
    {
      id: "standings",
      label: "Clasificación",
      href: `${base}/standings`,
      requiredPermission: COMPETITION_PERMISSION.read,
    },
    {
      id: "bracket",
      label: "Bracket",
      href: `${base}/bracket`,
      requiredPermission: COMPETITION_PERMISSION.read,
    },
    {
      id: "rankings",
      label: "Rankings",
      href: `${base}/rankings`,
      requiredPermission: COMPETITION_PERMISSION.read,
    },
    {
      id: "teams",
      label: "Equipos",
      href: `${base}/teams`,
      requiredPermission: TEAM_PERMISSION.read,
    },
    {
      id: "disputes",
      label: "Disputas",
      href: `${base}/disputes`,
      requiredPermission: COMPETITION_PERMISSION.read,
    },
    {
      id: "analytics",
      label: "Analíticas",
      href: `${base}/analytics`,
      requiredPermission: COMPETITION_PERMISSION.read,
    },
    {
      id: "rules",
      label: "Reglamento",
      href: `${base}/rules`,
      requiredPermission: COMPETITION_PERMISSION.read,
    },
  ];
}

export function generalNavFor(
  selection: WorkspaceSelection,
  allowedPermissions?: ReadonlySet<string>,
  t: Translator = createTranslator("es"),
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
    items: personalGeneralNav(t),
  };
}

export function contextNavFor(
  selection: WorkspaceSelection,
  allowedPermissions?: ReadonlySet<string>,
): ShellNavSection {
  if (selection.kind === WORKSPACE_SELECTION_KIND.competition) {
    const isOrgOperator =
      selection.organizationId != null &&
      allowedPermissions?.has(COMPETITION_PERMISSION.update) === true;
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
