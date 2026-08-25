import { useNavigate, useRouterState } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import {
  ActionBar,
  applyStyles,
  Button,
  colors,
  media,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
} from "@futrob/ui";
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

const styles = stylex.create({
  skipLink: {
    position: { default: "absolute", ":focus": "absolute" },
    width: { default: 1, ":focus": "auto" },
    height: { default: 1, ":focus": "auto" },
    paddingInline: { default: 0, ":focus": "0.75rem" },
    paddingBlock: { default: 0, ":focus": "0.5rem" },
    margin: { default: -1, ":focus": "0.75rem" },
    overflow: { default: "hidden", ":focus": "visible" },
    clip: { default: "rect(0, 0, 0, 0)", ":focus": "auto" },
    whiteSpace: { default: "nowrap", ":focus": "normal" },
    borderWidth: 0,
    zIndex: { default: null, ":focus": 50 },
    borderRadius: { default: null, ":focus": "var(--corner-lg)" },
    backgroundColor: { default: null, ":focus": colors.surface },
    boxShadow: {
      default: null,
      ":focus": "0 0 0 2px color-mix(in oklab, var(--ring) 25%, transparent)",
    },
  },
  main: {
    display: "flex",
    minHeight: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    flexDirection: "column",
    overflowY: "auto",
    paddingInline: { default: "1.5rem", ":has([data-shell-bleed])": 0 },
    paddingBlock: { default: "1.5rem", ":has([data-shell-bleed])": 0 },
  },
  commandBar: {
    display: {
      default: "none",
      [media.md]: "flex",
    },
    height: "3.5rem",
    flexShrink: 0,
    alignItems: "center",
    gap: "0.75rem",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.border,
    paddingInline: "1.25rem",
  },
  identity: {
    display: "flex",
    minWidth: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "0%",
    alignItems: "center",
  },
  commands: {
    display: "flex",
    flexShrink: 0,
    alignItems: "center",
    gap: "0.5rem",
  },
});

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
        <a href="#app-main" {...applyStyles(styles.skipLink)}>
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
          <div id="app-main" {...applyStyles(styles.main)}>
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
    <header {...applyStyles(styles.commandBar)}>
      <div {...applyStyles(styles.identity)}>
        <CommandBarIdentityMark emptyLabel={emptyLabel} identity={identity} ready={identityReady} />
      </div>
      {commands.length > 0 ? (
        <div {...applyStyles(styles.commands)}>
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
