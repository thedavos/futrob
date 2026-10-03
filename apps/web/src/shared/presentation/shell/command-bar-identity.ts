import { WORKSPACE_SELECTION_KIND, type WorkspaceSelection } from "./workspace-selection.ts";
import type { WorkspaceDisplayRole, WorkspaceSelectorModel } from "./workspace-selector-model.ts";

export type CommandBarIdentity = {
  readonly gamertag: string | null;
  readonly clubName: string | null;
  readonly imageUrl: string | null;
};

export function commandBarIdentity(input: {
  readonly gameAccounts: readonly { readonly identifier: string }[];
  readonly clubs: readonly { readonly name: string; readonly imageUrl: string | null }[];
}): CommandBarIdentity {
  const gamertag = input.gameAccounts[0]?.identifier.trim() || null;
  const club = input.clubs[0] ?? null;
  return {
    gamertag,
    clubName: club?.name.trim() || null,
    imageUrl: club?.imageUrl ?? null,
  };
}

export function commandBarIdentityLabel(identity: CommandBarIdentity, emptyLabel: string): string {
  if (identity.gamertag && identity.clubName) {
    return `${identity.gamertag} / ${identity.clubName}`;
  }
  return identity.gamertag ?? identity.clubName ?? emptyLabel;
}

export type CommandBarWorkspace = {
  readonly name: string | null;
  readonly role: WorkspaceDisplayRole | null;
};

/** Organization or competition in focus; `null` in the personal (club) context. */
export function commandBarWorkspace(
  selection: WorkspaceSelection,
  model: Pick<WorkspaceSelectorModel, "organizations" | "competitions">,
): CommandBarWorkspace | null {
  switch (selection.kind) {
    case WORKSPACE_SELECTION_KIND.personal:
      return null;
    case WORKSPACE_SELECTION_KIND.organization: {
      const match = model.organizations.find(
        (item) => item.organizationId === selection.organizationId,
      );
      return {
        name: match?.name.trim() || selection.label?.trim() || null,
        role: match?.role ?? null,
      };
    }
    case WORKSPACE_SELECTION_KIND.competition: {
      const match = model.competitions.find(
        (item) => item.competitionId === selection.competitionId,
      );
      return {
        name: match?.name.trim() || selection.label?.trim() || null,
        role: match?.role ?? null,
      };
    }
    default: {
      const _exhaustive: never = selection;
      return _exhaustive;
    }
  }
}

export function commandBarWorkspaceLabel(
  workspace: CommandBarWorkspace,
  roleLabel: string | null,
  emptyLabel: string,
): string {
  if (workspace.name && roleLabel) return `${workspace.name} / ${roleLabel}`;
  return workspace.name ?? roleLabel ?? emptyLabel;
}
