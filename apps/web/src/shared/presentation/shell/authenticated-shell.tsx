import { useNavigate, useRouterState } from "@tanstack/react-router";
import { ActionBar, Button, SidebarInset, SidebarProvider, SidebarRail } from "@futrob/ui";
import { type ReactNode, useCallback, useEffect, useState } from "react";
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
  selectionAfterAssociatingClub,
  type WorkspaceSelection,
} from "@/shared/presentation/shell/workspace-selection.ts";
import {
  WorkspaceSelectionProvider,
  useWorkspaceSelection,
} from "@/shared/presentation/shell/use-workspace-selection.tsx";
import { AddClubDialog } from "@/modules/teams/presentation/add-club-dialog.tsx";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  commandBarIdentityLabel,
  type CommandBarIdentity,
} from "@/shared/presentation/shell/command-bar-identity.ts";
import { CommandBarIdentityMark } from "@/shared/presentation/shell/command-bar-identity-mark.tsx";
import { DesktopSidebar, MobileNav } from "@/shared/presentation/shell/shell-sidebar-nav.tsx";

export { DesktopSidebar, MobileNav } from "@/shared/presentation/shell/shell-sidebar-nav.tsx";

export function AuthenticatedShell({ children }: { readonly children: ReactNode }) {
  return (
    <WorkspaceSelectionProvider>
      <AuthenticatedShellFrame>{children}</AuthenticatedShellFrame>
    </WorkspaceSelectionProvider>
  );
}

function AuthenticatedShellFrame({ children }: { readonly children: ReactNode }) {
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
            className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-6 has-[[data-shell-bleed]]:p-0"
            id="app-main"
          >
            {children}
          </div>
          <ShellActionBarSlot />
        </SidebarInset>
        <AddClubDialog
          onAssociated={() => {
            selectionState.select(selectionAfterAssociatingClub(selectionState.selection));
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
    <header className="hidden h-14 shrink-0 items-center gap-3 border-b border-border px-5 md:flex">
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
