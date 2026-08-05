import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
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
  Logo,
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
import { Building2, ChevronDown, Gamepad2, Menu, Settings, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import { authClient } from "@/modules/identity/adapters/auth/auth-client.ts";
import { initialsFromName } from "@/shared/presentation/initials-from-name.ts";
import { SHELL_NAV_ICONS } from "@/shared/presentation/shell/nav-icons.ts";
import {
  accountNavItems,
  generalNavFor,
  resolveActiveNavHref,
  type ShellNavItem,
} from "@/shared/presentation/shell/nav-registry.ts";
import {
  WORKSPACE_SELECTION_KIND,
  type CompetitionSelectorOption,
  type OrganizationSelectorOption,
  type WorkspaceSelection,
  pathForWorkspaceSelection,
} from "@/shared/presentation/shell/workspace-selection.ts";
import { writeStoredWorkspaceSelection } from "@/shared/presentation/shell/workspace-selection-storage.ts";
import { useWorkspaceSelection } from "@/shared/presentation/shell/use-workspace-selection.ts";

export function AuthenticatedShell({ children }: { readonly children: ReactNode }) {
  const selectionState = useWorkspaceSelection();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const title = pageTitleFor(pathname, selectionState.selection);

  return (
    <SidebarProvider>
      <a
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-3 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:ring-2 focus:ring-ring/25"
        href="#app-main"
      >
        Saltar al contenido
      </a>
      <DesktopSidebar
        associatedClubName={selectionState.associatedClubName}
        competitions={selectionState.competitions}
        memberships={selectionState.memberships}
        onSelect={selectionState.select}
        pathname={pathname}
        selection={selectionState.selection}
      />
      <SidebarInset>
        <SidebarRail>
          <MobileNav
            associatedClubName={selectionState.associatedClubName}
            competitions={selectionState.competitions}
            memberships={selectionState.memberships}
            onSelect={selectionState.select}
            pathname={pathname}
            selection={selectionState.selection}
            title={title}
          />
        </SidebarRail>
        <header className="hidden h-14 items-center border-b border-border px-5 md:flex">
          <h1 className="typo-heading text-lg">{title}</h1>
        </header>
        <div className="flex-1" id="app-main">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function DesktopSidebar(props: {
  readonly selection: WorkspaceSelection;
  readonly pathname: string;
  readonly memberships: readonly OrganizationSelectorOption[];
  readonly competitions: readonly CompetitionSelectorOption[];
  readonly associatedClubName: string | null;
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
  readonly associatedClubName: string | null;
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
          <Menu aria-hidden="true" />
        </SheetTrigger>
        <SheetContent className="w-[min(20rem,90vw)] p-0" side="left">
          <SheetHeader>
            <SheetTitle>Navegación</SheetTitle>
          </SheetHeader>
          <SheetBody className="p-0">
            <div className="flex min-h-full flex-col">
              <ShellSidebarBody
                {...props}
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
  associatedClubName,
  onSelect,
}: {
  readonly selection: WorkspaceSelection;
  readonly pathname: string;
  readonly memberships: readonly OrganizationSelectorOption[];
  readonly competitions: readonly CompetitionSelectorOption[];
  readonly associatedClubName: string | null;
  readonly onSelect: (selection: WorkspaceSelection) => void;
}) {
  const general = generalNavFor(selection);
  const homeHref =
    selection.kind === WORKSPACE_SELECTION_KIND.organization
      ? `/orgs/${selection.organizationId}`
      : "/player";

  return (
    <>
      <SidebarHeader>
        <Link className="flex items-center gap-2.5 px-1" to={homeHref}>
          <Logo className="h-7 w-auto" />
          <span className="font-semibold tracking-wide">Futrob</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{general.label}</SidebarGroupLabel>
          <NavItemList items={general.items} pathname={pathname} />
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{selectorContextLabel(selection)}</SidebarGroupLabel>
          <WorkspaceSelector
            associatedClubName={associatedClubName}
            competitions={competitions}
            memberships={memberships}
            onSelect={onSelect}
            selection={selection}
          />
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <AccountMenu />
      </SidebarFooter>
    </>
  );
}

function NavItemList({
  items,
  pathname,
}: {
  readonly items: readonly ShellNavItem[];
  readonly pathname: string;
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
            <span className="truncate">{item.label}</span>
          </>
        );
        return (
          <SidebarMenuItem key={item.id}>
            {item.stub ? (
              <SidebarMenuButton
                active={active}
                aria-current={active ? "page" : undefined}
                dense
                disabled
                title="Próximamente"
              >
                {label}
              </SidebarMenuButton>
            ) : (
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(sidebarMenuButtonVariants({ active, dense: true }))}
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
  associatedClubName,
  onSelect,
}: {
  readonly selection: WorkspaceSelection;
  readonly memberships: readonly OrganizationSelectorOption[];
  readonly competitions: readonly CompetitionSelectorOption[];
  readonly associatedClubName: string | null;
  readonly onSelect: (selection: WorkspaceSelection) => void;
}) {
  const navigate = useNavigate();
  const personalLabel = associatedClubName ?? "Asociar club";

  function choose(next: WorkspaceSelection) {
    writeStoredWorkspaceSelection(next);
    onSelect(next);
    if (next.kind === WORKSPACE_SELECTION_KIND.personal) {
      void navigate({ to: associatedClubName ? "/player" : "/player/ea-clubs" });
      return;
    }
    void navigate({ to: pathForWorkspaceSelection(next) });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button className="w-full justify-between font-medium" dense variant="outline" />}
      >
        <span className="flex min-w-0 items-center gap-2">
          <SelectorTriggerIcon selection={selection} />
          <span className="truncate">{selectorTriggerLabel(selection, personalLabel)}</span>
        </span>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0" />
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
            <Gamepad2 aria-hidden="true" className="size-4 shrink-0" />
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
              <Building2 aria-hidden="true" className="size-4 shrink-0" />
              <span className="truncate">{membership.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem
            onClick={() => {
              void navigate({ to: "/orgs/new" });
            }}
          >
            Crear organización
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AccountMenu() {
  const session = authClient.useSession();
  const navigate = useNavigate();
  const user = session.data?.user;
  const name = user?.name?.trim() || user?.email || "Cuenta";
  const items = accountNavItems();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Abrir menú de cuenta"
        render={<Button className="w-full justify-between px-2.5" dense variant="ghost" />}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Avatar className="size-8">
            <AvatarFallback>{initialsFromName(name)}</AvatarFallback>
          </Avatar>
          <span className="truncate text-sm">{name}</span>
        </span>
        <Settings aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56" side="top">
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

function selectorContextLabel(selection: WorkspaceSelection): string {
  switch (selection.kind) {
    case WORKSPACE_SELECTION_KIND.personal:
      return "Mi Club EA";
    case WORKSPACE_SELECTION_KIND.organization:
      return "Mi Organización";
    case WORKSPACE_SELECTION_KIND.competition:
      return "Mi Competición";
  }
}

function SelectorTriggerIcon({ selection }: { readonly selection: WorkspaceSelection }) {
  const className = "size-4 shrink-0 text-muted-foreground";
  switch (selection.kind) {
    case WORKSPACE_SELECTION_KIND.personal:
      return <Gamepad2 aria-hidden="true" className={className} />;
    case WORKSPACE_SELECTION_KIND.organization:
      return <Building2 aria-hidden="true" className={className} />;
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
