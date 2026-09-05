import { createContext } from "react";
import type { WorkspaceSelectionState } from "./use-workspace-selection.tsx";

/**
 * Lives in its own module so Vite HMR of the workspace hook does not mint a
 * new context object. A new object would make Provider and consumer miss each other.
 */
export const WorkspaceSelectionContext = createContext<WorkspaceSelectionState | null>(null);
