import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ImposeSanctionRequest } from "@futrob/api-contracts";
import type { Translator } from "@/shared/presentation/i18n/translate.ts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { CompetitionsClientError } from "../competitions-browser-client.ts";
import { sanctionsBrowserClient } from "./sanctions-browser-client.ts";

/** A refusal is final: retrying a 403/404 only delays the permission state. */
function retryUnlessRefused(failureCount: number, error: Error): boolean {
  return !sanctionRefusal(error) && failureCount < 2;
}

export function sanctionRefusal(error: Error | null): "forbidden" | "not_found" | null {
  if (!(error instanceof CompetitionsClientError)) return null;
  if (error.status === 403) return "forbidden";
  if (error.status === 404) return "not_found";
  return null;
}

/** Copy for a failed impose or revoke: the domain code when the API sent one. */
export function sanctionFailureText(error: Error | null, t: Translator): string {
  return error instanceof CompetitionsClientError ? t.error(error.code) : t("errors.fallback");
}

export function useCompetitionSanctionsQuery(organizationId: string, competitionId: string) {
  return useQuery({
    queryKey: queryKeys.competitions.sanctions(organizationId, competitionId),
    queryFn: () => sanctionsBrowserClient.list(organizationId, competitionId),
    retry: retryUnlessRefused,
  });
}

export function useTeamSanctionsQuery(
  organizationId: string,
  competitionId: string,
  teamId: string,
) {
  return useQuery({
    queryKey: queryKeys.competitions.teamSanctions(organizationId, competitionId, teamId),
    queryFn: () => sanctionsBrowserClient.listForTeam(organizationId, competitionId, teamId),
    retry: retryUnlessRefused,
  });
}

/**
 * Impose and revoke. Both refresh every sanctions list of the competition and its
 * statistics, because a points deduction rebuilds the table (ADR-0028).
 */
export function useSanctionCommands(organizationId: string, competitionId: string) {
  const queryClient = useQueryClient();
  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: queryKeys.competitions.sanctions(organizationId, competitionId),
      }),
      queryClient.invalidateQueries({ queryKey: queryKeys.statistics.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.all }),
    ]);
  }
  const impose = useMutation({
    mutationFn: (input: ImposeSanctionRequest) =>
      sanctionsBrowserClient.impose(organizationId, competitionId, input),
    onSuccess: refresh,
  });
  const revoke = useMutation({
    mutationFn: (input: { readonly sanctionId: string; readonly reason: string }) =>
      sanctionsBrowserClient.revoke(organizationId, competitionId, input.sanctionId, {
        reason: input.reason,
      }),
    onSuccess: refresh,
  });
  return { impose, revoke };
}
