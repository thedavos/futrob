import { ORGANIZATION_PERMISSION } from "@futrob/organizations";
import { useCan, type CanQuery } from "./use-can.ts";

const PLATFORM_SCOPE = {} as const;

export function useIsSuperuser(): CanQuery {
  return useCan(PLATFORM_SCOPE, ORGANIZATION_PERMISSION.superusersManage);
}
