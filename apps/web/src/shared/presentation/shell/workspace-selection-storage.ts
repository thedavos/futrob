import { WORKSPACE_SELECTION_KIND, type WorkspaceSelection } from "./workspace-selection.ts";

export const WORKSPACE_SELECTION_STORAGE_KEY = "futrob.workspace-selection";

export function readStoredWorkspaceSelection(): WorkspaceSelection | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WORKSPACE_SELECTION_STORAGE_KEY);
    if (!raw) return null;
    return parseStoredWorkspaceSelection(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function writeStoredWorkspaceSelection(selection: WorkspaceSelection): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WORKSPACE_SELECTION_STORAGE_KEY, JSON.stringify(selection));
  } catch {
    // ignore quota / private mode
  }
}

function parseStoredWorkspaceSelection(value: unknown): WorkspaceSelection | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.kind === WORKSPACE_SELECTION_KIND.personal) {
    return { kind: WORKSPACE_SELECTION_KIND.personal };
  }
  if (
    record.kind === WORKSPACE_SELECTION_KIND.organization &&
    typeof record.organizationId === "string"
  ) {
    return {
      kind: WORKSPACE_SELECTION_KIND.organization,
      organizationId: record.organizationId,
      label: typeof record.label === "string" ? record.label : undefined,
    };
  }
  if (
    record.kind === WORKSPACE_SELECTION_KIND.competition &&
    typeof record.competitionId === "string"
  ) {
    return {
      kind: WORKSPACE_SELECTION_KIND.competition,
      competitionId: record.competitionId,
      organizationId: typeof record.organizationId === "string" ? record.organizationId : null,
      label: typeof record.label === "string" ? record.label : undefined,
    };
  }
  return null;
}
