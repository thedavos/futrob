import { WORKSPACE_SELECTION_KIND, type WorkspaceSelection } from "./workspace-selection.ts";

export type ShellCommand = {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
  readonly href?: string;
  readonly requiredPermission?: string;
};

export function commandsFor(
  pathname: string,
  selection: WorkspaceSelection,
  allowedPermissions?: ReadonlySet<string>,
): readonly ShellCommand[] {
  let commands: readonly ShellCommand[];
  if (selection.kind === WORKSPACE_SELECTION_KIND.competition) {
    commands = [
      { id: "sync", label: "Sync EA", disabled: true },
      {
        id: "publish",
        label: "Publicar",
        disabled: true,
        requiredPermission: "competitions.publish",
      },
    ];
  } else if (selection.kind === WORKSPACE_SELECTION_KIND.organization) {
    commands = [
      {
        id: "new-competition",
        label: "Nueva competición",
        href: `/orgs/${selection.organizationId}/competitions/new`,
        requiredPermission: "competitions.update",
      },
    ];
  } else if (pathname.startsWith("/player/competitions")) {
    commands = [{ id: "accept-invite", label: "Aceptar invitación", disabled: false }];
  } else if (pathname.startsWith("/player/ea-clubs")) {
    commands = [{ id: "associate-club", label: "Asociar club", disabled: false }];
  } else {
    commands = [];
  }
  const visible = allowedPermissions
    ? commands.filter(
        (command) =>
          !command.requiredPermission || allowedPermissions.has(command.requiredPermission),
      )
    : commands;
  return visible.map(({ requiredPermission: _requiredPermission, ...command }) => command);
}
