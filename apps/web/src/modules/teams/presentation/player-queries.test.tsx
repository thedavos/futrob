// @vitest-environment jsdom

import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { GetMyPlayerProfileResponse } from "@futrob/api-contracts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { useAssociateMyExternalClubMutation } from "./player-queries.ts";
import { teamsBrowserClient } from "./teams-browser-client.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

const existingProfile: GetMyPlayerProfileResponse = {
  profile: { id: "profile-1", createdAt: "2026-08-01T00:00:00.000Z" },
  gameAccounts: [],
  externalClubs: [
    {
      playerProfileId: "profile-1",
      providerKey: "ea-clubs",
      externalClubId: "10754",
      externalClubName: "Night Owls",
      platform: "common-gen5",
      gameEdition: "fc26",
      imageUrl: null,
      associatedAt: "2026-08-01T12:00:00.000Z",
    },
  ],
};

const newClubInput = {
  providerKey: "ea-clubs" as const,
  externalClubId: "22110",
  platform: "common-gen5",
  gameEdition: "fc26",
  name: "Cuervos FC1",
  imageUrl: "https://example.com/cuervos.png",
};

describe("useAssociateMyExternalClubMutation", () => {
  it("does not put a club in cache before the server responds", async () => {
    vi.spyOn(teamsBrowserClient, "associateMyExternalClub").mockReturnValue(
      new Promise(() => undefined),
    );
    const queryClient = createClient();
    queryClient.setQueryData(queryKeys.players.me(), existingProfile);
    const { result } = renderHook(() => useAssociateMyExternalClubMutation(), {
      wrapper: wrapperFor(queryClient),
    });

    act(() => {
      result.current.mutate(newClubInput);
    });

    await waitFor(() => expect(result.current.isPending).toBe(true));
    expect(queryClient.getQueryData(queryKeys.players.me())).toEqual(existingProfile);
  });

  it("writes the server association into the profile cache", async () => {
    const associate = vi.spyOn(teamsBrowserClient, "associateMyExternalClub").mockResolvedValue({
      profile: { id: "profile-1", createdAt: "2026-08-01T00:00:00.000Z" },
      externalClub: {
        playerProfileId: "profile-1",
        providerKey: "ea-clubs",
        externalClubId: "22110",
        externalClubName: "Cuervos FC1",
        platform: "common-gen5",
        gameEdition: "fc26",
        imageUrl: "https://example.com/cuervos.png",
        associatedAt: "2026-08-14T22:00:00.000Z",
      },
    });
    const queryClient = createClient();
    queryClient.setQueryData(queryKeys.players.me(), existingProfile);
    const { result } = renderHook(() => useAssociateMyExternalClubMutation(), {
      wrapper: wrapperFor(queryClient),
    });

    await act(() => result.current.mutateAsync(newClubInput));

    expect(associate).toHaveBeenCalledWith(newClubInput);
    const cached = queryClient.getQueryData<GetMyPlayerProfileResponse>(queryKeys.players.me());
    expect(cached?.externalClubs.map((club) => club.externalClubName)).toEqual([
      "Night Owls",
      "Cuervos FC1",
    ]);
    expect(cached?.externalClubs.at(-1)?.associatedAt).toBe("2026-08-14T22:00:00.000Z");
  });
});

function createClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
}

function wrapperFor(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}
