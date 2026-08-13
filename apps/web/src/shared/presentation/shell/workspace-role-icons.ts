import type { Icon } from "@futrob/ui";
import {
  CrownIcon,
  CrownSimpleIcon,
  FlagBannerIcon,
  IdentificationBadgeIcon,
  SoccerBallIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { WORKSPACE_DISPLAY_ROLE, type WorkspaceDisplayRole } from "./workspace-selector-model.ts";

export const WORKSPACE_ROLE_ICONS: Record<WorkspaceDisplayRole, Icon> = {
  [WORKSPACE_DISPLAY_ROLE.organizer]: FlagBannerIcon,
  [WORKSPACE_DISPLAY_ROLE.staff]: IdentificationBadgeIcon,
  [WORKSPACE_DISPLAY_ROLE.member]: UserIcon,
  [WORKSPACE_DISPLAY_ROLE.captain]: CrownIcon,
  [WORKSPACE_DISPLAY_ROLE.vice_captain]: CrownSimpleIcon,
  [WORKSPACE_DISPLAY_ROLE.player]: SoccerBallIcon,
};

export type WorkspaceRoleMessageKey =
  | "shell.workspace.role.organizer"
  | "shell.workspace.role.staff"
  | "shell.workspace.role.member"
  | "shell.workspace.role.captain"
  | "shell.workspace.role.viceCaptain"
  | "shell.workspace.role.player";

export function workspaceRoleMessageKey(role: WorkspaceDisplayRole): WorkspaceRoleMessageKey {
  switch (role) {
    case WORKSPACE_DISPLAY_ROLE.organizer:
      return "shell.workspace.role.organizer";
    case WORKSPACE_DISPLAY_ROLE.staff:
      return "shell.workspace.role.staff";
    case WORKSPACE_DISPLAY_ROLE.member:
      return "shell.workspace.role.member";
    case WORKSPACE_DISPLAY_ROLE.captain:
      return "shell.workspace.role.captain";
    case WORKSPACE_DISPLAY_ROLE.vice_captain:
      return "shell.workspace.role.viceCaptain";
    case WORKSPACE_DISPLAY_ROLE.player:
      return "shell.workspace.role.player";
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}
