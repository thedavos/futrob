import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ActionBar,
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  cn,
  sidebarMenuButtonVariants,
  useSidebar,
} from "@futrob/ui";
import {
  Buildings,
  CaretDown,
  CheckSquareOffset,
  List,
  Plus,
  Sidebar as SidebarExpandIcon,
  SidebarSimple,
  Trophy,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { authClient } from "@/modules/identity/adapters/auth/auth-client.ts";
import { initialsFromName } from "@/shared/presentation/initials-from-name.ts";
import { ClubCrestAvatar } from "@/shared/presentation/club-crest-avatar.tsx";
import { SHELL_NAV_ICONS } from "@/shared/presentation/shell/nav-icons.ts";
import {
  accountNavItems,
  contextNavFor,
  generalNavFor,
  resolveActiveNavHref,
  type ShellNavItem,
} from "@/shared/presentation/shell/nav-registry.ts";
import {
  ShellActionBarProvider,
  useShellActionBar,
} from "@/shared/presentation/shell/shell-action-bar.tsx";
import {
  readStoredShellChrome,
  writeStoredShellChrome,
} from "@/shared/presentation/shell/shell-chrome-storage.ts";
import { commandsFor } from "@/shared/presentation/shell/shell-commands.ts";
import {
  WORKSPACE_SELECTION_KIND,
  type CompetitionSelectorOption,
  type OrganizationSelectorOption,
  type WorkspaceSelection,
  pathForWorkspaceSelection,
} from "@/shared/presentation/shell/workspace-selection.ts";
import { writeStoredWorkspaceSelection } from "@/shared/presentation/shell/workspace-selection-storage.ts";
import { useWorkspaceSelection } from "@/shared/presentation/shell/use-workspace-selection.ts";

type AssociatedClubSummary = {
  readonly name: string;
  readonly imageUrl: string | null;
};

export function AuthenticatedShell({ children }: { readonly children: ReactNode }) {
  const selectionState = useWorkspaceSelection();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const title = pageTitleFor(pathname, selectionState.selection);
  const commands = commandsFor(pathname, selectionState.selection);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = readStoredShellChrome();
    if (stored) setCollapsed(stored.collapsed);
  }, []);

  const onCollapsedChange = useCallback((next: boolean) => {
    setCollapsed(next);
    writeStoredShellChrome({ collapsed: next });
  }, []);

  return (
    <SidebarProvider
      collapsed={collapsed}
      data-density="dense"
      onCollapsedChange={onCollapsedChange}
    >
      <ShellActionBarProvider>
        <a
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-3 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:ring-2 focus:ring-ring/25"
          href="#app-main"
        >
          Saltar al contenido
        </a>
        <DesktopSidebar
          associatedClub={selectionState.associatedClub}
          competitions={selectionState.competitions}
          memberships={selectionState.memberships}
          onSelect={selectionState.select}
          pathname={pathname}
          selection={selectionState.selection}
        />
        <SidebarInset>
          <SidebarRail>
            <MobileNav
              associatedClub={selectionState.associatedClub}
              competitions={selectionState.competitions}
              memberships={selectionState.memberships}
              onSelect={selectionState.select}
              pathname={pathname}
              selection={selectionState.selection}
              title={title}
            />
          </SidebarRail>
          <CommandBar commands={commands} selection={selectionState.selection} title={title} />
          <div className="min-h-0 flex-1 overflow-y-auto" id="app-main">
            {children}
          </div>
          <ShellActionBarSlot />
        </SidebarInset>
      </ShellActionBarProvider>
    </SidebarProvider>
  );
}

function CommandBar({
  title,
  commands,
  selection,
}: {
  readonly title: string;
  readonly commands: ReturnType<typeof commandsFor>;
  readonly selection: WorkspaceSelection;
}) {
  const navigate = useNavigate();

  return (
    <header className="hidden h-14 shrink-0 items-center gap-3 border-b border-border px-4 md:flex">
      <h1 className="typo-heading min-w-0 flex-1 truncate text-lg">{title}</h1>
      {commands.length > 0 ? (
        <div className="flex shrink-0 items-center gap-2">
          {commands.map((command) => (
            <Button
              dense
              disabled={command.disabled}
              key={command.id}
              onClick={() => {
                if (command.disabled) return;
                if (command.id === "new-competition") {
                  if (selection.kind !== WORKSPACE_SELECTION_KIND.organization) return;
                  void navigate({
                    to: "/orgs/$orgId/competitions/new",
                    params: { orgId: selection.organizationId },
                  });
                  return;
                }
                if (command.id === "accept-invite") {
                  void navigate({ to: "/invitations/accept" });
                  return;
                }
                if (command.id === "associate-club") {
                  void navigate({ to: "/player/ea-clubs" });
                }
              }}
              variant={command.id === commands[0]?.id ? "default" : "outline"}
            >
              {command.label}
            </Button>
          ))}
        </div>
      ) : null}
    </header>
  );
}

function ShellActionBarSlot() {
  const { actions } = useShellActionBar();
  if (actions.length === 0) return null;
  return (
    <ActionBar>
      {actions.map((action) => (
        <span key={action.id}>{action.node}</span>
      ))}
    </ActionBar>
  );
}

function DesktopSidebar(props: {
  readonly selection: WorkspaceSelection;
  readonly pathname: string;
  readonly memberships: readonly OrganizationSelectorOption[];
  readonly competitions: readonly CompetitionSelectorOption[];
  readonly associatedClub: AssociatedClubSummary | null;
  readonly onSelect: (selection: WorkspaceSelection) => void;
}) {
  return (
    <Sidebar aria-label="Navegación principal">
      <ShellSidebarBody {...props} />
    </Sidebar>
  );
}

function MobileNav(props: {
  readonly selection: WorkspaceSelection;
  readonly pathname: string;
  readonly memberships: readonly OrganizationSelectorOption[];
  readonly competitions: readonly CompetitionSelectorOption[];
  readonly associatedClub: AssociatedClubSummary | null;
  readonly onSelect: (selection: WorkspaceSelection) => void;
  readonly title: string;
}) {
  const { openMobile, setOpenMobile } = useSidebar();

  return (
    <>
      <Sheet onOpenChange={setOpenMobile} open={openMobile}>
        <SheetTrigger
          render={<Button aria-label="Abrir navegación" size="icon" variant="outline" />}
        >
          <List aria-hidden="true" />
        </SheetTrigger>
        <SheetContent className="w-[min(20rem,90vw)] p-0" side="left">
          <SheetHeader>
            <SheetTitle>Navegación</SheetTitle>
          </SheetHeader>
          <SheetBody className="p-0">
            <div className="flex h-full min-h-0 flex-col">
              <ShellSidebarBody
                {...props}
                forceExpanded
                onSelect={(next) => {
                  props.onSelect(next);
                  setOpenMobile(false);
                }}
              />
            </div>
          </SheetBody>
        </SheetContent>
      </Sheet>
      <span className="truncate text-sm font-medium">{props.title}</span>
    </>
  );
}

function ShellSidebarBody({
  selection,
  pathname,
  memberships,
  competitions,
  associatedClub,
  onSelect,
  forceExpanded = false,
}: {
  readonly selection: WorkspaceSelection;
  readonly pathname: string;
  readonly memberships: readonly OrganizationSelectorOption[];
  readonly competitions: readonly CompetitionSelectorOption[];
  readonly associatedClub: AssociatedClubSummary | null;
  readonly onSelect: (selection: WorkspaceSelection) => void;
  readonly forceExpanded?: boolean;
}) {
  const { collapsed, toggleCollapsed } = useSidebar();
  const compact = collapsed && !forceExpanded;
  const general = generalNavFor(selection);
  const context = contextNavFor(selection);
  const footerItems = context.items.length > 0 ? context.items : general.items;
  const showCollapseControl = !forceExpanded;

  return (
    <>
      <SidebarHeader className={compact ? "items-center gap-2 p-2" : "gap-3"}>
        <div className={cn("flex w-full items-center gap-1", compact && "flex-col")}>
          <AccountMenu compact={compact} />
          {showCollapseControl ? (
            <Button
              aria-label={collapsed ? "Expandir barra lateral" : "Colapsar barra lateral"}
              className={compact ? undefined : "ml-auto shrink-0"}
              dense
              onClick={toggleCollapsed}
              size="icon"
              variant="ghost"
            >
              {collapsed ? (
                <SidebarExpandIcon aria-hidden="true" />
              ) : (
                <SidebarSimple aria-hidden="true" />
              )}
            </Button>
          ) : null}
        </div>
        {compact ? null : (
          <WorkspaceSelector
            associatedClub={associatedClub}
            competitions={competitions}
            memberships={memberships}
            onSelect={onSelect}
            selection={selection}
          />
        )}
      </SidebarHeader>
      {compact ? (
        <SidebarContent className="items-center p-2">
          <Button
            aria-label="Expandir para ver cola"
            dense
            onClick={toggleCollapsed}
            size="icon"
            title="Expandir barra lateral"
            variant="ghost"
          >
            <CheckSquareOffset aria-hidden="true" />
          </Button>
        </SidebarContent>
      ) : (
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Cola</SidebarGroupLabel>
            <QueuePlaceholder />
          </SidebarGroup>
        </SidebarContent>
      )}
      <SidebarFooter className={compact ? "items-center p-2" : undefined}>
        <NavItemList compact={compact} items={footerItems} pathname={pathname} />
      </SidebarFooter>
    </>
  );
}

function QueuePlaceholder() {
  return (
    <div className="rounded-lg border border-dashed border-border-strong px-3 py-4 text-center">
      <p className="text-sm font-medium text-foreground">Sin tareas pendientes</p>
      <p className="typo-caption text-muted-foreground">
        Las tareas del espacio activo aparecerán aquí.
      </p>
    </div>
  );
}

function NavItemList({
  items,
  pathname,
  compact = false,
}: {
  readonly items: readonly ShellNavItem[];
  readonly pathname: string;
  readonly compact?: boolean;
}) {
  const activeHref = resolveActiveNavHref(pathname, items);

  return (
    <SidebarMenu>
      {items.map((item) => {
        const active = item.href === activeHref;
        const Icon = item.icon ? SHELL_NAV_ICONS[item.icon] : null;
        const label = (
          <>
            {Icon ? <Icon aria-hidden="true" className="size-4 shrink-0" /> : null}
            {compact ? null : <span className="truncate">{item.label}</span>}
          </>
        );
        return (
          <SidebarMenuItem key={item.id}>
            {item.stub ? (
              <SidebarMenuButton
                active={active}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={compact ? "justify-center px-0" : undefined}
                dense
                disabled
                title={item.label}
              >
                {label}
              </SidebarMenuButton>
            ) : (
              <Link
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={cn(
                  sidebarMenuButtonVariants({ active, dense: true }),
                  compact && "justify-center px-0",
                )}
                title={item.label}
                to={item.href}
              >
                {label}
              </Link>
            )}
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

function WorkspaceSelector({
  selection,
  memberships,
  competitions,
  associatedClub,
  onSelect,
}: {
  readonly selection: WorkspaceSelection;
  readonly memberships: readonly OrganizationSelectorOption[];
  readonly competitions: readonly CompetitionSelectorOption[];
  readonly associatedClub: AssociatedClubSummary | null;
  readonly onSelect: (selection: WorkspaceSelection) => void;
}) {
  const navigate = useNavigate();
  const personalLabel = associatedClub?.name ?? "Asociar club";

  function choose(next: WorkspaceSelection) {
    writeStoredWorkspaceSelection(next);
    onSelect(next);
    if (next.kind === WORKSPACE_SELECTION_KIND.personal) {
      void navigate({ to: associatedClub ? "/player" : "/player/ea-clubs" });
      return;
    }
    void navigate({ to: pathForWorkspaceSelection(next) });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button className="group w-full justify-between font-medium" dense variant="outline" />
        }
      >
        <span className="flex min-w-0 items-center gap-2">
          <SelectorTriggerIcon associatedClub={associatedClub} selection={selection} />
          <span className="truncate">{selectorTriggerLabel(selection, personalLabel)}</span>
        </span>
        <CaretDown
          aria-hidden="true"
          className="size-4 shrink-0 transition-transform duration-(--duration-normal) ease-(--ease-emphasized) group-aria-expanded:rotate-180"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Competiciones</DropdownMenuLabel>
          {competitions.length === 0 ? (
            <DropdownMenuItem disabled>Sin competiciones todavía</DropdownMenuItem>
          ) : (
            competitions.map((competition) => (
              <DropdownMenuItem
                key={competition.competitionId}
                onClick={() =>
                  choose({
                    kind: WORKSPACE_SELECTION_KIND.competition,
                    competitionId: competition.competitionId,
                    organizationId: competition.organizationId,
                    label: competition.name,
                  })
                }
              >
                <Trophy aria-hidden="true" className="size-4 shrink-0" />
                <span className="truncate">{competition.name}</span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Clubes EA</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => choose({ kind: WORKSPACE_SELECTION_KIND.personal })}>
            <ClubMenuIcon club={associatedClub} />
            <span className="truncate">{personalLabel}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Organizaciones</DropdownMenuLabel>
          {memberships.map((membership) => (
            <DropdownMenuItem
              key={membership.organizationId}
              onClick={() =>
                choose({
                  kind: WORKSPACE_SELECTION_KIND.organization,
                  organizationId: membership.organizationId,
                  label: membership.name,
                })
              }
            >
              <Buildings aria-hidden="true" className="size-4 shrink-0" />
              <span className="truncate">{membership.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem
            onClick={() => {
              void navigate({ to: "/orgs/new" });
            }}
          >
            <Plus aria-hidden="true" className="size-4 shrink-0" />
            Crear organización
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ClubMenuIcon({ club }: { readonly club: AssociatedClubSummary | null }) {
  if (!club) {
    return <Plus aria-hidden="true" className="size-4 shrink-0" />;
  }
  return <ClubCrestAvatar imageUrl={club.imageUrl} name={club.name} />;
}

function AccountMenu({ compact = false }: { readonly compact?: boolean }) {
  const session = authClient.useSession();
  const navigate = useNavigate();
  const user = session.data?.user;
  const name = user?.name?.trim() || user?.email || "Cuenta";
  const shortName = abbreviatedDisplayName(name);
  const items = accountNavItems();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Abrir menú de cuenta"
        render={
          <Button
            className={cn(
              "group min-w-0",
              compact ? "justify-center px-0" : "w-auto max-w-full justify-start px-1.5",
            )}
            dense
            size={compact ? "icon" : "default"}
            variant="ghost"
          />
        }
      >
        <span className={cn("flex min-w-0 items-center gap-2", compact && "gap-0")}>
          <Avatar className="size-6 shrink-0">
            <AvatarFallback className="text-xs! leading-none">
              {initialsFromName(name)}
            </AvatarFallback>
          </Avatar>
          {compact ? null : (
            <span className="flex min-w-0 items-center gap-1">
              <span className="truncate text-sm font-medium" title={name}>
                {shortName}
              </span>
              <CaretDown
                aria-hidden="true"
                className="size-3 shrink-0 text-muted-foreground transition-transform duration-(--duration-normal) ease-(--ease-emphasized) group-aria-expanded:rotate-180"
                weight="bold"
              />
            </span>
          )}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56" side="bottom">
        {items.map((item) => (
          <DropdownMenuItem
            disabled={item.stub}
            key={item.id}
            onClick={() => {
              if (!item.stub) void navigate({ to: item.href });
            }}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            void authClient.signOut().then(() => {
              void navigate({ to: "/login", replace: true });
            });
          }}
        >
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function abbreviatedDisplayName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "Cuenta";
  if (trimmed.includes("@")) {
    const local = trimmed.slice(0, trimmed.indexOf("@")) || trimmed;
    return local.length > 12 ? `${local.slice(0, 10)}…` : local;
  }
  const first = trimmed.split(/\s+/).find(Boolean) ?? trimmed;
  return first.length > 14 ? `${first.slice(0, 12)}…` : first;
}

function SelectorTriggerIcon({
  selection,
  associatedClub,
}: {
  readonly selection: WorkspaceSelection;
  readonly associatedClub: AssociatedClubSummary | null;
}) {
  const className = "size-4 shrink-0 text-muted-foreground";
  switch (selection.kind) {
    case WORKSPACE_SELECTION_KIND.personal:
      return <ClubMenuIcon club={associatedClub} />;
    case WORKSPACE_SELECTION_KIND.organization:
      return <Buildings aria-hidden="true" className={className} />;
    case WORKSPACE_SELECTION_KIND.competition:
      return <Trophy aria-hidden="true" className={className} />;
  }
}

function selectorTriggerLabel(selection: WorkspaceSelection, personalLabel: string): string {
  switch (selection.kind) {
    case WORKSPACE_SELECTION_KIND.personal:
      return personalLabel;
    case WORKSPACE_SELECTION_KIND.organization:
      return selection.label ?? "Organización";
    case WORKSPACE_SELECTION_KIND.competition:
      return selection.label ?? "Competición";
  }
}

function pageTitleFor(pathname: string, selection: WorkspaceSelection): string {
  if (pathname.includes("/ea-clubs")) return "Clubes EA";
  if (pathname.includes("/game-accounts")) return "Datos de juego";
  if (pathname.includes("/competitions/") && pathname.includes("/setup")) {
    return "Configuración de competición";
  }
  if (/\/orgs\/[^/]+\/competitions\/new$/.test(pathname)) return "Nueva competición";
  if (/\/orgs\/[^/]+\/competitions\/?$/.test(pathname)) return "Competiciones";
  if (pathname.startsWith("/player/competitions")) return "Competiciones";
  if (selection.kind === WORKSPACE_SELECTION_KIND.competition) {
    return selection.label ?? "Competición";
  }
  if (selection.kind === WORKSPACE_SELECTION_KIND.organization) {
    return selection.label ?? "Organización";
  }
  if (pathname.startsWith("/player")) return "Espacio personal";
  return "Futrob";
}
