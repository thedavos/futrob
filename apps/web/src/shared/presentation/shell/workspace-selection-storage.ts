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
  if (!value || typeof value !== "object" || !("kind" in value)) return null;
  if (value.kind === WORKSPACE_SELECTION_KIND.personal) {
    return { kind: WORKSPACE_SELECTION_KIND.personal };
  }
  if (
    value.kind === WORKSPACE_SELECTION_KIND.organization &&
    "organizationId" in value &&
    typeof value.organizationId === "string"
  ) {
    return {
      kind: WORKSPACE_SELECTION_KIND.organization,
      organizationId: value.organizationId,
      label: "label" in value && typeof value.label === "string" ? value.label : undefined,
    };
  }
  if (
    value.kind === WORKSPACE_SELECTION_KIND.competition &&
    "competitionId" in value &&
    typeof value.competitionId === "string"
  ) {
    return {
      kind: WORKSPACE_SELECTION_KIND.competition,
      competitionId: value.competitionId,
      organizationId:
        "organizationId" in value && typeof value.organizationId === "string"
          ? value.organizationId
          : null,
      label: "label" in value && typeof value.label === "string" ? value.label : undefined,
    };
  }
  return null;
}
