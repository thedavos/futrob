import type { ActorId } from "@futrob/shared-kernel";

export const SIDEBAR_LAYOUTS = ["navigation", "pending-queue"] as const;

export type SidebarLayout = (typeof SIDEBAR_LAYOUTS)[number];

export const DEFAULT_SIDEBAR_LAYOUT: SidebarLayout = "navigation";

export interface ActorPreferences {
  readonly sidebarLayout: SidebarLayout;
}

export interface ActorPreferencesUpdate extends ActorPreferences {
  readonly actorId: ActorId;
  readonly updatedAt: Date;
}
