import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { getCompetitionDraft } from "./competitions-browser-client.ts";

export function useCompetitionDraftQuery(organizationId: string, competitionId: string) {
  return useQuery({
    queryKey: queryKeys.competitions.draft(organizationId, competitionId),
    queryFn: () => getCompetitionDraft(organizationId, competitionId),
  });
}
