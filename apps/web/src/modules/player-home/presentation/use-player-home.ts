import { useQueryClient } from "@tanstack/react-query";
import type {
  GetMyGameProfileResponse,
  GetMyPlayerProfileResponse,
  GetMyRecentMatchesResponse,
  PlayerRecentProviderMatchDto,
} from "@futrob/api-contracts";
import { useMyAccessibleCompetitionsQuery } from "@/modules/competitions/presentation/competition-queries.ts";
import {
  useMyGameProfileQuery,
  useMyRecentMatchesQuery,
} from "@/modules/statistics/presentation/statistics-queries.ts";
import {
  useMyNextEncounterQuery,
  useMyPlayerProfileQuery,
  useMyRosterInvitationsQuery,
} from "@/modules/teams/presentation/player-queries.ts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import {
  resolvePlayerHome,
  type PlayerHomeFacts,
  type PlayerHomeHeaderCta,
  type PlayerHomeLayout,
} from "./player-home-model.ts";

export type PlayerHomeSlotStatus =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly retry: () => void }
  | { readonly kind: "ready" }
  | { readonly kind: "refreshing"; readonly updatedAt: Date; readonly retry: () => void };

export type PlayerHomeSlots = {
  readonly hero: PlayerHomeSlotStatus;
  readonly invitations: PlayerHomeSlotStatus;
  readonly eaCard: PlayerHomeSlotStatus;
  readonly performance: PlayerHomeSlotStatus;
  readonly bottomLeft: PlayerHomeSlotStatus;
  readonly bottomRight: PlayerHomeSlotStatus;
};

export type PlayerHomeView =
  | {
      readonly phase: "loading";
      readonly loadingGrid: "onboarding" | "dashboard";
      readonly headerCta: "matches";
      readonly refreshMatches: () => Promise<void>;
      readonly matchesRefreshing: boolean;
    }
  | {
      readonly phase: "ready";
      readonly layout: PlayerHomeLayout;
      readonly facts: PlayerHomeFacts;
      readonly slots: PlayerHomeSlots;
      readonly headerCta: PlayerHomeHeaderCta;
      readonly refreshMatches: () => Promise<void>;
      readonly matchesRefreshing: boolean;
    };

type QueryLike<T> = {
  readonly data: T | undefined;
  readonly dataUpdatedAt: number;
  readonly isPending: boolean;
  readonly isError: boolean;
  readonly isFetching: boolean;
  readonly refetch: () => void;
};

export function usePlayerHome(
  externalClubId: string | undefined,
  profileReady: boolean,
): PlayerHomeView {
  const queryClient = useQueryClient();
  const profileQuery = useMyPlayerProfileQuery();
  const recentQuery = useMyRecentMatchesQuery(externalClubId, profileReady);
  const gameProfileQuery = useMyGameProfileQuery(
    externalClubId ? { externalClubId } : {},
    profileReady,
  );
  const competitionsQuery = useMyAccessibleCompetitionsQuery();
  const invitationsQuery = useMyRosterInvitationsQuery();
  const nextEncounterQuery = useMyNextEncounterQuery(profileReady);

  const refreshMatches = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.gameData.meRecentMatches(externalClubId),
    });

  const matchesRefreshing = recentQuery.isFetching && recentQuery.data !== undefined;
  const profileSettled =
    !profileQuery.isPending || profileQuery.data !== undefined || profileQuery.isError;

  if (!profileSettled) {
    return {
      phase: "loading",
      loadingGrid: externalClubId ? "dashboard" : "onboarding",
      headerCta: "matches",
      refreshMatches,
      matchesRefreshing,
    };
  }

  const facts = factsFromQueries({
    externalClubId,
    profile: profileQuery.data,
    recent: recentQuery.data,
    gameProfile: gameProfileQuery.data,
    competitions: competitionsQuery.data?.competitions ?? [],
    nextEncounter: nextEncounterQuery.data?.encounter ?? null,
    pendingInvitations:
      invitationsQuery.data?.invitations.filter((item) => item.status === "pending").length ?? 0,
  });
  const layout = resolvePlayerHome(facts);
  const matchesSettled =
    !recentQuery.isPending || recentQuery.data !== undefined || recentQuery.isError;

  return {
    phase: "ready",
    layout,
    facts,
    slots: {
      hero: combineSlotStatus([nextEncounterQuery, competitionsQuery, profileQuery]),
      invitations: slotStatus(invitationsQuery),
      eaCard: slotStatus(profileQuery),
      performance: combineSlotStatus([profileQuery, recentQuery, gameProfileQuery]),
      bottomLeft: combineSlotStatus([profileQuery, recentQuery]),
      bottomRight: slotStatus(competitionsQuery),
    },
    headerCta: matchesSettled ? layout.headerCta : "matches",
    refreshMatches,
    matchesRefreshing,
  };
}

function factsFromQueries(input: {
  readonly externalClubId: string | undefined;
  readonly profile: GetMyPlayerProfileResponse | undefined;
  readonly recent: GetMyRecentMatchesResponse | undefined;
  readonly gameProfile: GetMyGameProfileResponse | undefined;
  readonly competitions: PlayerHomeFacts["competitions"];
  readonly nextEncounter: PlayerHomeFacts["nextEncounter"];
  readonly pendingInvitations: number;
}): PlayerHomeFacts {
  const selectedClub = input.profile?.externalClubs.find(
    (club) => club.externalClubId === input.externalClubId,
  );
  const gamertag = input.profile?.gameAccounts[0]?.identifier;

  return {
    club: input.externalClubId
      ? {
          kind: "selected",
          id: input.externalClubId,
          name:
            selectedClub?.externalClubName ?? selectedClub?.externalClubId ?? input.externalClubId,
          imageUrl: selectedClub?.imageUrl ?? null,
        }
      : { kind: "none" },
    ea: gamertag ? { kind: "linked", gamertag } : { kind: "unlinked" },
    matches: matchesFromRecent(input.recent),
    competitions: input.competitions,
    nextEncounter: input.nextEncounter,
    pendingInvitations: input.pendingInvitations,
    gameProfile: input.gameProfile?.status === "ready" ? input.gameProfile.profile : null,
  };
}

function matchesFromRecent(
  recent: GetMyRecentMatchesResponse | undefined,
): PlayerHomeFacts["matches"] {
  if (!recent || recent.status === "needs_club" || recent.status === "needs_game_account") {
    return { kind: "unavailable" };
  }
  const last = firstMatch(recent.matches);
  return last ? { kind: "some", last } : { kind: "none" };
}

function firstMatch(
  matches: readonly PlayerRecentProviderMatchDto[],
): PlayerRecentProviderMatchDto | undefined {
  return matches[0];
}

function slotStatus<T>(query: QueryLike<T>): PlayerHomeSlotStatus {
  const retry = () => {
    query.refetch();
  };
  if (query.isPending && query.data === undefined) return { kind: "loading" };
  if (query.isError && query.data === undefined) return { kind: "error", retry };
  if (query.isFetching || query.isError) {
    return { kind: "refreshing", updatedAt: new Date(query.dataUpdatedAt), retry };
  }
  return { kind: "ready" };
}

function combineSlotStatus(queries: readonly QueryLike<unknown>[]): PlayerHomeSlotStatus {
  if (queries.some((query) => query.isPending && query.data === undefined)) {
    return { kind: "loading" };
  }
  const failed = queries.find((query) => query.isError && query.data === undefined);
  if (failed) {
    return {
      kind: "error",
      retry: () => {
        for (const query of queries) {
          if (query.isError) query.refetch();
        }
      },
    };
  }
  const stale = queries.find((query) => query.isFetching || query.isError);
  if (stale) {
    return {
      kind: "refreshing",
      updatedAt: new Date(Math.max(...queries.map((query) => query.dataUpdatedAt))),
      retry: () => {
        for (const query of queries) {
          if (query.isError || query.isFetching) query.refetch();
        }
      },
    };
  }
  return { kind: "ready" };
}
