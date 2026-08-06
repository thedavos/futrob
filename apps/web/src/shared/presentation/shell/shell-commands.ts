import { WORKSPACE_SELECTION_KIND, type WorkspaceSelection } from "./workspace-selection.ts";

export type ShellCommand = {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
  readonly href?: string;
};

export function commandsFor(
  pathname: string,
  selection: WorkspaceSelection,
): readonly ShellCommand[] {
  if (selection.kind === WORKSPACE_SELECTION_KIND.competition) {
    return [
      { id: "sync", label: "Sync EA", disabled: true },
      { id: "publish", label: "Publicar", disabled: true },
    ];
  }
  if (selection.kind === WORKSPACE_SELECTION_KIND.organization) {
    return [
      {
        id: "new-competition",
        label: "Nueva competición",
        href: `/orgs/${selection.organizationId}/competitions/new`,
      },
    ];
  }
  if (pathname.startsWith("/player/competitions")) {
    return [{ id: "accept-invite", label: "Aceptar invitación", disabled: false }];
  }
  if (pathname.startsWith("/player/ea-clubs")) {
    return [{ id: "associate-club", label: "Asociar club", disabled: false }];
  }
  return [];
}
