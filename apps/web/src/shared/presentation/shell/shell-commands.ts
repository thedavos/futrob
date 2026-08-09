import type { Permission } from "@futrob/shared-kernel";
import { COMPETITION_PERMISSION } from "@futrob/competitions";
import { TEAM_PERMISSION } from "@futrob/teams";
import { WORKSPACE_SELECTION_KIND, type WorkspaceSelection } from "./workspace-selection.ts";

export type ShellCommand = {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
  readonly href?: string;
  readonly requiredPermission?: Permission;
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
        requiredPermission: COMPETITION_PERMISSION.publish,
      },
      {
        id: "manage-roster",
        label: "Gestionar plantilla",
        disabled: true,
        requiredPermission: TEAM_PERMISSION.rosterManage,
      },
    ];
  } else if (selection.kind === WORKSPACE_SELECTION_KIND.organization) {
    commands = [
      {
        id: "new-competition",
        label: "Nueva competición",
        href: `/orgs/${selection.organizationId}/competitions/new`,
        requiredPermission: COMPETITION_PERMISSION.update,
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
