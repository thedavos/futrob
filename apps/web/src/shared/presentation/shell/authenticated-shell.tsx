import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ActionBar,
  Avatar,
  AvatarFallback,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  CaretDownIcon,
  CheckSquareOffsetIcon,
  ListIcon,
  SidebarIcon as SidebarExpandIcon,
  SidebarSimpleIcon,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { authClient } from "@/modules/identity/adapters/auth/auth-client.ts";
import { initialsFromName } from "@/shared/presentation/initials-from-name.ts";
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
  type WorkspaceSelection,
} from "@/shared/presentation/shell/workspace-selection.ts";
import { useWorkspaceSelection } from "@/shared/presentation/shell/use-workspace-selection.ts";
import { WorkspaceSelector } from "@/shared/presentation/shell/workspace-selector.tsx";
import type { WorkspaceSelectorModel } from "@/shared/presentation/shell/workspace-selector-model.ts";
import { AddClubDialog } from "@/modules/teams/presentation/add-club-dialog.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  commandBarIdentityLabel,
  type CommandBarIdentity,
} from "@/shared/presentation/shell/command-bar-identity.ts";
import { CommandBarIdentityMark } from "@/shared/presentation/shell/command-bar-identity-mark.tsx";

export function AuthenticatedShell({ children }: { readonly children: ReactNode }) {
  const { t } = useI18n();
  const selectionState = useWorkspaceSelection();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const identityLabel = selectionState.playerIdentityReady
    ? commandBarIdentityLabel(selectionState.playerIdentity, t("player.workspace.eyebrow"))
    : "";
  const commands = commandsFor(
    pathname,
    selectionState.selection,
    selectionState.allowedPermissions,
  );
  const [collapsed, setCollapsed] = useState(false);
  const [addClubOpen, setAddClubOpen] = useState(false);

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
          allowedPermissions={selectionState.allowedPermissions}
          model={selectionState.selectorModel}
          onRequestAddClub={() => setAddClubOpen(true)}
          onSelect={selectionState.select}
          pathname={pathname}
          selection={selectionState.selection}
        />
        <SidebarInset>
          <SidebarRail>
            <MobileNav
              allowedPermissions={selectionState.allowedPermissions}
              model={selectionState.selectorModel}
              onRequestAddClub={() => setAddClubOpen(true)}
              onSelect={selectionState.select}
              pathname={pathname}
              selection={selectionState.selection}
              title={identityLabel}
            />
          </SidebarRail>
          <CommandBar
            commands={commands}
            identity={selectionState.playerIdentity}
            identityReady={selectionState.playerIdentityReady}
            onAddClub={() => setAddClubOpen(true)}
            selection={selectionState.selection}
          />
          <div
            className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 has-[[data-shell-bleed]]:p-0"
            id="app-main"
          >
            {children}
          </div>
          <ShellActionBarSlot />
        </SidebarInset>
        <AddClubDialog
          onAssociated={() => {
            selectionState.select({ kind: WORKSPACE_SELECTION_KIND.personal });
            void navigate({ to: "/player/ea-clubs" });
          }}
          onOpenChange={setAddClubOpen}
          open={addClubOpen}
        />
      </ShellActionBarProvider>
    </SidebarProvider>
  );
}

function CommandBar({
  commands,
  identity,
  identityReady,
  selection,
  onAddClub,
}: {
  readonly commands: ReturnType<typeof commandsFor>;
  readonly identity: CommandBarIdentity;
  readonly identityReady: boolean;
  readonly selection: WorkspaceSelection;
  readonly onAddClub: () => void;
}) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const emptyLabel = t("player.workspace.eyebrow");

  return (
    <header className="hidden h-14 shrink-0 items-center gap-3 border-b border-border px-4 md:flex">
      <div className="flex min-w-0 flex-1 items-center">
        <CommandBarIdentityMark emptyLabel={emptyLabel} identity={identity} ready={identityReady} />
      </div>
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
                  onAddClub();
                }
              }}
              variant={command.id === commands[0]?.id ? "default" : "outline"}
            >
              {command.id === "associate-club" ? t("shell.workspace.addClub") : command.label}
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

type ShellSidebarProps = {
  readonly selection: WorkspaceSelection;
  readonly pathname: string;
  readonly model: WorkspaceSelectorModel;
  readonly allowedPermissions: ReadonlySet<string>;
  readonly onSelect: (selection: WorkspaceSelection) => void;
  readonly onRequestAddClub: () => void;
};

function DesktopSidebar(props: ShellSidebarProps) {
  return (
    <Sidebar aria-label="Navegación principal">
      <ShellSidebarBody {...props} />
    </Sidebar>
  );
}

function MobileNav(props: ShellSidebarProps & { readonly title: string }) {
  const { openMobile, setOpenMobile } = useSidebar();

  return (
    <>
      <Sheet onOpenChange={setOpenMobile} open={openMobile}>
        <SheetTrigger
          render={<Button aria-label="Abrir navegación" size="icon" variant="outline" />}
        >
          <ListIcon aria-hidden="true" />
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
  model,
  allowedPermissions,
  onSelect,
  onRequestAddClub,
  forceExpanded = false,
}: ShellSidebarProps & { readonly forceExpanded?: boolean }) {
  const { collapsed, toggleCollapsed } = useSidebar();
  const { t } = useI18n();
  const compact = collapsed && !forceExpanded;
  const general = generalNavFor(selection, allowedPermissions, t);
  const context = contextNavFor(selection, allowedPermissions);
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
                <SidebarSimpleIcon aria-hidden="true" />
              )}
            </Button>
          ) : null}
        </div>
        {compact ? null : (
          <WorkspaceSelector
            model={model}
            onRequestAddClub={onRequestAddClub}
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
            <CheckSquareOffsetIcon aria-hidden="true" />
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
              <CaretDownIcon
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
