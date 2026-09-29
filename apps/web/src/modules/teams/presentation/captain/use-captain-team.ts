import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TEAM_PERMISSION } from "@futrob/teams";
import { useCapabilities } from "@/shared/presentation/permissions/index.ts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { membershipForCompetition } from "@/shared/presentation/shell/team-scope.ts";
import { useMyTeamsQuery } from "../player-queries.ts";
import { resolveCaptainTeamAccess, type CaptainTeamAccess } from "./captain-team-access.ts";

const CAPTAIN_CAPABILITIES = {
  manageRoster: TEAM_PERMISSION.rosterManage,
  manageRoles: TEAM_PERMISSION.rosterRolesManage,
  manageInvitations: TEAM_PERMISSION.invitationsManage,
  manageExternalClub: TEAM_PERMISSION.externalClubManage,
} as const;

export type CaptainCapability = keyof typeof CAPTAIN_CAPABILITIES;

export type CaptainCapabilities = { readonly [K in CaptainCapability]: boolean };

export type CaptainTeam = {
  readonly access: CaptainTeamAccess;
  readonly capabilities: CaptainCapabilities;
  readonly retry: () => void;
};

export function useCaptainTeam(input: {
  readonly competitionId: string;
  readonly organizationId: string | null;
  /** Capability the page requires; the rest only toggle secondary actions. */
  readonly required: CaptainCapability;
}): CaptainTeam {
  const queryClient = useQueryClient();
  const teams = useMyTeamsQuery();
  const membership = membershipForCompetition(input.competitionId, teams.data);
  const scope = useMemo(
    () => ({
      organizationId: membership?.organizationId ?? input.organizationId ?? undefined,
      competitionId: input.competitionId,
      teamId: membership?.teamId,
    }),
    [input.competitionId, input.organizationId, membership],
  );
  const caps = useCapabilities(scope, CAPTAIN_CAPABILITIES);
  const access = resolveCaptainTeamAccess({
    competitionId: input.competitionId,
    organizationId: input.organizationId,
    teamsStatus: teams.status,
    membership,
    capability: {
      allowed: caps[input.required],
      loading: caps.loading,
      unavailable: caps.unavailable,
    },
  });
  const ready = access.kind === "ready";
  return {
    access,
    capabilities: {
      manageRoster: ready && caps.manageRoster,
      manageRoles: ready && caps.manageRoles,
      manageInvitations: ready && caps.manageInvitations,
      manageExternalClub: ready && caps.manageExternalClub,
    },
    retry: () => {
      void teams.refetch();
      void queryClient.invalidateQueries({ queryKey: queryKeys.authorization.all });
    },
  };
}
