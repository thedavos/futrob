import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CloseSwissRoundRequest,
  GenerateCompetitionFixtureRequest,
  WithdrawSwissTeamRequest,
} from "@futrob/api-contracts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import {
  competitionFixtureBrowserClient,
  CompetitionFixtureClientError,
} from "./competition-fixture-browser-client.ts";
import { scheduleChangeBrowserClient } from "./schedule-change-browser-client.ts";
import type { SwissFixtureCommands } from "./swiss-fixture-commands.ts";

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

/**
 * The Swiss organizer commands. A failed command rereads without holding the form back; a
 * successful one rereads first, so the dialog closes on the updated calendar. Standings and
 * encounter lists change too: a bye or withdrawal moves the table, a pairing adds encounters.
 */
export function useSwissFixtureCommands(
  organizationId: string,
  competitionId: string,
): SwissFixtureCommands {
  const client = useQueryClient();
  const reread = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: queryKeys.scheduling.all }),
      client.invalidateQueries({ queryKey: queryKeys.encounters.all }),
      client.invalidateQueries({ queryKey: queryKeys.statistics.all }),
      client.invalidateQueries({ queryKey: queryKeys.players.meNextEncounter() }),
    ]);
  const callbacks = {
    onSuccess: async () => {
      await reread();
    },
    onError: () => {
      void reread();
    },
  };
  const generate = useMutation({
    mutationFn: (body: GenerateCompetitionFixtureRequest) =>
      scheduleChangeBrowserClient().generateFixture(organizationId, competitionId, body),
    ...callbacks,
  });
  const withdraw = useMutation({
    mutationFn: ({
      body,
      fixturePlanId,
    }: {
      readonly fixturePlanId: string;
      readonly body: WithdrawSwissTeamRequest;
    }) =>
      scheduleChangeBrowserClient().withdrawSwissTeam(
        organizationId,
        competitionId,
        fixturePlanId,
        body,
      ),
    ...callbacks,
  });
  const closeRound = useMutation({
    mutationFn: ({
      body,
      fixturePlanId,
      roundNumber,
    }: {
      readonly fixturePlanId: string;
      readonly roundNumber: number;
      readonly body: CloseSwissRoundRequest;
    }) =>
      scheduleChangeBrowserClient().closeSwissRound(
        organizationId,
        competitionId,
        fixturePlanId,
        roundNumber,
        body,
      ),
    ...callbacks,
  });
  return {
    generate: async (body) => {
      await generate.mutateAsync(body);
    },
    withdraw: async (fixturePlanId, body) => {
      await withdraw.mutateAsync({ fixturePlanId, body });
    },
    closeRound: async (fixturePlanId, roundNumber, body) => {
      await closeRound.mutateAsync({ fixturePlanId, roundNumber, body });
    },
  };
}

export function isFixtureRefusal(error: Error | null): boolean {
  return (
    error instanceof CompetitionFixtureClientError && (error.status === 403 || error.status === 404)
  );
}
