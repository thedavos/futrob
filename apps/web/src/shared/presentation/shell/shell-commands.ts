import type { Permission } from "@futrob/shared-kernel";
import { WORKSPACE_SELECTION_KIND, type WorkspaceSelection } from "./workspace-selection.ts";

export type ShellCommand = {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
  readonly href?: string;
  readonly variant?: "default" | "outline" | "link";
  readonly requiredPermission?: Permission;
};

export function commandsFor(
  pathname: string,
  selection: WorkspaceSelection,
  allowedPermissions?: ReadonlySet<string>,
): readonly ShellCommand[] {
  let commands: readonly ShellCommand[];
  if (
    selection.kind === WORKSPACE_SELECTION_KIND.competition ||
    selection.kind === WORKSPACE_SELECTION_KIND.organization
  ) {
    commands = [];
  } else if (pathname.startsWith("/player/competitions")) {
    commands = [
      { id: "accept-invite", label: "Aceptar invitación", disabled: false, variant: "link" },
    ];
  } else if (pathname.startsWith("/player/ea-clubs")) {
    commands = [{ id: "associate-club", label: "Añadir club", disabled: false }];
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
