import type { Permission } from "@futrob/shared-kernel";

export const ENCOUNTER_PERMISSION = {
  read: "encounters.read",
  scheduleManage: "encounters.schedule.manage",
  rescheduleRequest: "encounters.reschedule.request",
  rescheduleResolve: "encounters.reschedule.resolve",
} as const satisfies Record<string, Permission>;

export const ENCOUNTER_PERMISSIONS = Object.values(ENCOUNTER_PERMISSION);
