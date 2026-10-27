import { useQuery } from "@tanstack/react-query";
import type { CompetitionDto, MembershipSummaryDto } from "@futrob/api-contracts";
import { FutrobApiError } from "@futrob/sdk";
import { getFutrobClient } from "@/modules/api/futrob-client";
import { mobileQueryKeys } from "@/modules/query/query-keys";
import { useSessionGeneration } from "@/modules/query/session-query-client-provider";
import { allowedPermissionSet, SHELL_PERMISSIONS, scopeForDestination } from "./permissions.ts";

export type Destination =
  | { kind: "player" }
  | { kind: "picker" }
  | { kind: "organization"; organizationId: string }
  | { kind: "competition"; organizationId: string; competitionId: string; setup?: boolean };

export type DestinationData = {
  memberships: readonly MembershipSummaryDto[];
  competitions: readonly CompetitionDto[];
  permissions: ReadonlySet<string>;
  accessUnavailable: boolean;
};

async function loadDestination(destination: Destination): Promise<DestinationData> {
  const client = getFutrobClient();
  const [mine, competitions] = await Promise.all([
    client.organizations.listMine(),
    client.competitions.listMine(),
  ]);
  const scope = scopeForDestination(destination);
  try {
    const access = await client.authorization.getEffectiveAccess(scope, SHELL_PERMISSIONS);
    return {
      memberships: mine.memberships,
      competitions: competitions.competitions.map((entry) => entry.competition),
      permissions: allowedPermissionSet(access),
      accessUnavailable: false,
    };
  } catch (error) {
    if (error instanceof FutrobApiError && error.status === 401) throw error;
    return {
      memberships: mine.memberships,
      competitions: competitions.competitions.map((entry) => entry.competition),
      permissions: new Set(),
      accessUnavailable: true,
    };
  }
}

export function useNativeDestination(destination: Destination) {
  const orgId = "organizationId" in destination ? destination.organizationId : undefined;
  const competitionId = "competitionId" in destination ? destination.competitionId : undefined;
  const generation = useSessionGeneration();
  return useQuery({
    queryKey: mobileQueryKeys.destination(generation, {
      kind: destination.kind,
      organizationId: orgId,
      competitionId,
    }),
    queryFn: () => loadDestination(destination),
    retry: false,
  });
}

export function isUnauthorizedDestination(error: Error | null): boolean {
  return error instanceof FutrobApiError && error.status === 401;
}
