import type { RosterMembershipRoleDto } from "@futrob/api-contracts";
import { useI18n } from "@/shared/presentation/i18n/i18n-provider.tsx";

export const ROSTER_ROLES = [
  "player",
  "captain",
  "vice_captain",
] as const satisfies readonly RosterMembershipRoleDto[];

export function useRoleLabels() {
  const { t } = useI18n();
  return {
    player: t("roster.role.player"),
    captain: t("roster.role.captain"),
    vice_captain: t("roster.role.vice_captain"),
  } satisfies Record<RosterMembershipRoleDto, string>;
}
