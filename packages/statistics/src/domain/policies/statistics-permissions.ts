import type { Permission } from "@futrob/shared-kernel";

export const STATISTICS_PERMISSION = {
  readOwn: "statistics.read-own",
  read: "statistics.read",
} as const satisfies Record<string, Permission>;

export const STATISTICS_PERMISSIONS = Object.values(STATISTICS_PERMISSION);
