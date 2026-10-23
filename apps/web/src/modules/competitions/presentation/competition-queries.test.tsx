// @vitest-environment jsdom

import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type {
  CompetitionEntryDto,
  ListCompetitionParticipantsResponse,
} from "@futrob/api-contracts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { useRemoveCompetitionParticipantMutation } from "./competition-queries.ts";

const removeCompetitionParticipant = vi.fn<() => Promise<void>>();

vi.mock("./competitions-browser-client.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./competitions-browser-client.ts")>()),
  removeCompetitionParticipant: () => removeCompetitionParticipant(),
}));

const participantsKey = queryKeys.competitions.participants("org-1", "competition-1");

function entry(id: string): CompetitionEntryDto {
  return {
    id,
    organizationId: "org-1",
    competitionId: "competition-1",
    teamId: `team-${id}`,
    status: "approved",
    createdAt: "2026-10-20T00:00:00.000Z",
  };
}

function renderRemove() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  queryClient.setQueryData<ListCompetitionParticipantsResponse>(participantsKey, {
    participants: [entry("entry-1"), entry("entry-2")],
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(
    () => useRemoveCompetitionParticipantMutation("org-1", "competition-1"),
    { wrapper },
  );
  const participantIds = () =>
    queryClient
      .getQueryData<ListCompetitionParticipantsResponse>(participantsKey)
      ?.participants.map((participant) => participant.id);
  return { result, participantIds };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("removing a competition participant", () => {
  it("hides the participant before the server answers", async () => {
    removeCompetitionParticipant.mockReturnValue(new Promise(() => undefined));
    const { result, participantIds } = renderRemove();

    act(() => result.current.mutate("entry-1"));

    await waitFor(() => expect(participantIds()).toEqual(["entry-2"]));
  });

  it("shows the participant again when removing fails", async () => {
    removeCompetitionParticipant.mockRejectedValue(new Error("not editable"));
    const { result, participantIds } = renderRemove();

    await act(() => result.current.mutateAsync("entry-1").catch(() => undefined));

    expect(participantIds()).toEqual(["entry-1", "entry-2"]);
  });
});
