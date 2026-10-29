import { BILLING_PERMISSION } from "@futrob/billing";
import type { Permission } from "@futrob/shared-kernel";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { ORGANIZATION_PERMISSION } from "@futrob/organizations";
import { RESULT_PERMISSION } from "@futrob/results";
import { STATISTICS_PERMISSION } from "@futrob/statistics";
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
  | "settings"
  | "plan"
  | "overview"
  | "fixture"
  | "encounters"
  | "standings"
  | "bracket"
  | "rankings"
  | "disputes"
  | "analytics"
  | "rules";

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
    { id: "home", label: t("shell.nav.home"), href: "/player", icon: "home" },
    {
      id: "competitions",
      label: t("shell.nav.competitions"),
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
    {
      id: "invitations",
      label: t("shell.nav.invitations"),
      href: "/invitations",
      icon: "invitations",
    },
  ];
}

function organizationGeneralNav(organizationId: string, t: Translator): readonly ShellNavItem[] {
  const base = `/orgs/${organizationId}`;
  return [
    {
      id: "home",
      label: t("shell.nav.home"),
      href: base,
      icon: "home",
      requiredPermission: ORGANIZATION_PERMISSION.read,
    },
    {
      id: "competitions",
      label: t("shell.nav.competitions"),
      href: `${base}/competitions`,
      icon: "competitions",
      requiredPermission: COMPETITION_PERMISSION.read,
    },
    {
      id: "teams",
      label: t("shell.nav.teams"),
      href: `${base}/teams`,
      icon: "teams",
      requiredPermission: TEAM_PERMISSION.read,
    },
    {
      id: "players",
      label: t("shell.nav.players"),
      href: `${base}/players`,
      icon: "players",
      // The page lists who plays on each roster, so it follows roster access.
      requiredPermission: TEAM_PERMISSION.rosterRead,
    },
    {
      id: "invitations",
      label: t("shell.nav.invitations"),
      href: `${base}/invitations`,
      icon: "invitations",
      requiredPermission: ORGANIZATION_PERMISSION.invitationsManage,
    },
    {
      id: "organization",
      label: t("pages.organization.members.title"),
      href: `${base}/settings/members`,
      icon: "organization",
      requiredPermission: ORGANIZATION_PERMISSION.membershipsRead,
    },
    {
      id: "plan",
      label: t("pages.organization.plan.title"),
      href: `${base}/settings/plan`,
      icon: "plan",
      requiredPermission: BILLING_PERMISSION.read,
    },
    {
      id: "settings",
      label: t("shell.nav.settings"),
      href: `${base}/settings`,
      icon: "settings",
      requiredPermission: ORGANIZATION_PERMISSION.update,
    },
  ];
}

/** Separate from the official standings table; follows statistics access, not competition editing. */
function teamPerformanceItem(competitionBase: string, t: Translator): ShellNavItem {
  return {
    id: "team-performance",
    label: t("pages.competition.teamPerformance.title"),
    href: `${competitionBase}/team-performance`,
    icon: "statistics",
    requiredPermission: STATISTICS_PERMISSION.read,
  };
}

function personalCompetitionContext(
  organizationId: string | null,
  competitionId: string,
  t: Translator,
): readonly ShellNavItem[] {
  const base = organizationId
    ? `/orgs/${organizationId}/competitions/${competitionId}`
    : `/player/competitions/${competitionId}`;
  return [
    { id: "overview", label: t("shell.nav.competition.overview"), href: base, icon: "overview" },
    {
      id: "matches",
      label: t("pages.competitionPlayer.matches.title"),
      href: `${base}/matches`,
      icon: "matches",
    },
    {
      id: "stats",
      label: t("pages.competitionPlayer.stats.title"),
      href: `${base}/stats`,
      icon: "statistics",
    },
    // The ranking page only exists under the organization route.
    ...(organizationId ? [teamPerformanceItem(base, t)] : []),
    {
      id: "team",
      label: t("pages.competitionPlayer.team.title"),
      href: `${base}/team`,
      icon: "teams",
      requiredPermission: TEAM_PERMISSION.read,
    },
    {
      id: "roster",
      label: t("shell.nav.competition.roster"),
      href: `${base}/team/roster`,
      icon: "players",
      requiredPermission: TEAM_PERMISSION.rosterManage,
    },
    {
      id: "team-invitations",
      label: t("shell.nav.competition.teamInvitations"),
      href: `${base}/team/invitations`,
      icon: "invitations",
      requiredPermission: TEAM_PERMISSION.invitationsManage,
    },
  ];
}

function organizationCompetitionContext(
  organizationId: string,
  competitionId: string,
  t: Translator,
): readonly ShellNavItem[] {
  const base = `/orgs/${organizationId}/competitions/${competitionId}`;
  return [
    {
      id: "overview",
      label: t("shell.nav.competition.overview"),
      href: base,
      icon: "overview",
      requiredPermission: COMPETITION_PERMISSION.read,
    },
    {
      id: "fixture",
      label: t("pages.competition.fixture.title"),
      href: `${base}/fixture`,
      icon: "fixture",
      requiredPermission: COMPETITION_PERMISSION.read,
    },
    {
      id: "encounters",
      label: t("pages.competition.encounters.title"),
      href: `${base}/encounters`,
      icon: "encounters",
      requiredPermission: COMPETITION_PERMISSION.read,
    },
    {
      id: "standings",
      label: t("pages.competition.standings.title"),
      href: `${base}/standings`,
      icon: "standings",
      requiredPermission: COMPETITION_PERMISSION.read,
    },
    {
      id: "bracket",
      label: t("pages.competition.bracket.title"),
      href: `${base}/bracket`,
      icon: "bracket",
      requiredPermission: COMPETITION_PERMISSION.read,
    },
    {
      id: "rankings",
      label: t("pages.competition.rankings.title"),
      href: `${base}/rankings`,
      icon: "rankings",
      requiredPermission: COMPETITION_PERMISSION.read,
    },
    teamPerformanceItem(base, t),
    {
      id: "teams",
      label: t("shell.nav.competition.teams"),
      href: `${base}/teams`,
      icon: "teams",
      requiredPermission: TEAM_PERMISSION.read,
    },
    {
      id: "disputes",
      label: t("pages.competition.disputes.title"),
      href: `${base}/disputes`,
      icon: "disputes",
      requiredPermission: RESULT_PERMISSION.resultApprove,
    },
    {
      id: "analytics",
      label: t("pages.competition.analytics.title"),
      href: `${base}/analytics`,
      icon: "analytics",
      requiredPermission: COMPETITION_PERMISSION.read,
    },
    {
      id: "rules",
      label: t("pages.competition.rules.title"),
      href: `${base}/rules`,
      icon: "rules",
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
      label: t("shell.nav.general"),
      items: filterByPermission(
        organizationGeneralNav(selection.organizationId, t),
        allowedPermissions,
      ),
    };
  }

  return {
    id: NAV_SECTION.general,
    label: t("shell.nav.general"),
    items: personalGeneralNav(t),
  };
}

export function contextNavFor(
  selection: WorkspaceSelection,
  allowedPermissions?: ReadonlySet<string>,
  t: Translator = createTranslator("es"),
): ShellNavSection {
  if (selection.kind === WORKSPACE_SELECTION_KIND.competition) {
    const isOrgOperator =
      selection.organizationId != null &&
      allowedPermissions?.has(COMPETITION_PERMISSION.update) === true;
    const items = isOrgOperator
      ? organizationCompetitionContext(selection.organizationId!, selection.competitionId, t)
      : personalCompetitionContext(selection.organizationId, selection.competitionId, t);

    return {
      id: NAV_SECTION.context,
      label: t("shell.nav.context"),
      items: filterByPermission(items, allowedPermissions),
    };
  }

  return {
    id: NAV_SECTION.context,
    label: t("shell.nav.context"),
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

export function accountNavItems(t: Translator = createTranslator("es")): readonly ShellNavItem[] {
  return [
    { id: "profile", label: t("shell.account.profile"), href: "/player/profile", stub: true },
    { id: "feedback", label: t("shell.account.feedback"), href: "/feedback", stub: true },
    { id: "contact", label: t("shell.account.contact"), href: "/contact", stub: true },
    { id: "settings", label: t("shell.account.settings"), href: "/settings", stub: true },
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
