import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import {
  competitionFixtureBrowserClient,
  CompetitionFixtureClientError,
} from "./competition-fixture-browser-client.ts";

/** A hidden competition answers 404 on purpose. Asking again cannot change that. */
const retryUnlessRefused = (failureCount: number, error: Error) =>
  !(error instanceof CompetitionFixtureClientError && [401, 403, 404].includes(error.status)) &&
  failureCount < 2;

export function useCurrentCompetitionFixture(organizationId: string, competitionId: string) {
  return useQuery({
    queryKey: queryKeys.scheduling.currentFixture(organizationId, competitionId),
    queryFn: () => competitionFixtureBrowserClient.getCurrent(organizationId, competitionId),
    retry: retryUnlessRefused,
  });
}

export function isFixtureRefusal(error: Error | null): boolean {
  return (
    error instanceof CompetitionFixtureClientError && (error.status === 403 || error.status === 404)
  );
}
