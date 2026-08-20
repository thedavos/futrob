import { hasBrowserWindow } from "@futrob/ui";
import { z } from "zod";
import { WORKSPACE_SELECTION_KIND, type WorkspaceSelection } from "./workspace-selection.ts";

export const WORKSPACE_SELECTION_STORAGE_KEY = "futrob.workspace-selection";

const workspaceSelectionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal(WORKSPACE_SELECTION_KIND.personal),
    externalClubId: z.string().optional(),
  }),
  z.object({
    kind: z.literal(WORKSPACE_SELECTION_KIND.organization),
    organizationId: z.string(),
    label: z.string().optional(),
  }),
  z.object({
    kind: z.literal(WORKSPACE_SELECTION_KIND.competition),
    competitionId: z.string(),
    organizationId: z.string().nullable(),
    label: z.string().optional(),
  }),
]);

export function readStoredWorkspaceSelection(): WorkspaceSelection | null {
  if (!hasBrowserWindow()) return null;
  try {
    const raw = window.localStorage.getItem(WORKSPACE_SELECTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = workspaceSelectionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function writeStoredWorkspaceSelection(selection: WorkspaceSelection): void {
  if (!hasBrowserWindow()) return;
  try {
    window.localStorage.setItem(WORKSPACE_SELECTION_STORAGE_KEY, JSON.stringify(selection));
  } catch {
    // ignore quota / private mode
  }
}
