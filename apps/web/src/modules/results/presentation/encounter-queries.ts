import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { encounterBrowserClient, EncounterClientError } from "./encounter-browser-client.ts";

/** A hidden or missing Encounter answers 404 on purpose; asking again cannot change that. */
const retryUnlessRefused = (failureCount: number, error: Error) =>
  !(error instanceof EncounterClientError && [401, 403, 404].includes(error.status)) &&
  failureCount < 2;

export function useEncounterViewQuery(organizationId: string, encounterId: string) {
  return useQuery({
    queryKey: queryKeys.encounters.view(organizationId, encounterId),
    queryFn: () => encounterBrowserClient.getEncounterView(organizationId, encounterId),
    retry: retryUnlessRefused,
  });
}

export function useCompetitionEncountersQuery(organizationId: string, competitionId: string) {
  return useQuery({
    queryKey: queryKeys.encounters.competition(organizationId, competitionId),
    queryFn: () => encounterBrowserClient.listCompetitionEncounters(organizationId, competitionId),
    retry: retryUnlessRefused,
  });
}

export function useEncounterCandidatesQuery(encounterId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.encounters.candidates(encounterId),
    queryFn: () => encounterBrowserClient.listEncounterCandidates(encounterId),
    enabled,
    retry: retryUnlessRefused,
  });
}

export function isRefusal(error: Error | null): "not_found" | "forbidden" | null {
  if (!(error instanceof EncounterClientError)) return null;
  if (error.status === 404) return "not_found";
  if (error.status === 403) return "forbidden";
  return null;
}
