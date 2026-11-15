// @vitest-environment jsdom

import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type {
  CompetitionDraftDto,
  CompetitionEntryDto,
  ListCompetitionParticipantsResponse,
} from "@futrob/api-contracts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { leagueDraft } from "./competition-rules-fixtures.ts";
import {
  usePublishCompetitionMutation,
  useRemoveCompetitionParticipantMutation,
  useUpdateCompetitionDraftMutation,
} from "./competition-queries.ts";

const removeCompetitionParticipant = vi.fn<() => Promise<void>>();
const updateCompetitionDraft = vi.fn<() => Promise<CompetitionDraftDto>>();
const publishCompetition = vi.fn<() => Promise<CompetitionDraftDto>>();

vi.mock("./competitions-browser-client.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./competitions-browser-client.ts")>()),
  removeCompetitionParticipant: () => removeCompetitionParticipant(),
  updateCompetitionDraft: () => updateCompetitionDraft(),
  publishCompetition: () => publishCompetition(),
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

describe("commands on a competition draft", () => {
  it("publishes only after an earlier draft save has reached the server", async () => {
    let finishSave: (draft: CompetitionDraftDto) => void = () => {};
    updateCompetitionDraft.mockReturnValue(
      new Promise((resolve) => {
        finishSave = resolve;
      }),
    );
    publishCompetition.mockResolvedValue(leagueDraft);
    const queryClient = new QueryClient();
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () => ({
        update: useUpdateCompetitionDraftMutation("org-1", "competition-1"),
        publish: usePublishCompetitionMutation("org-1", "competition-1"),
      }),
      { wrapper },
    );

    act(() => result.current.update.mutate({} as never));
    act(() => result.current.publish.mutate());
    await waitFor(() => expect(updateCompetitionDraft).toHaveBeenCalled());
    expect(publishCompetition).not.toHaveBeenCalled();

    finishSave(leagueDraft);

    await waitFor(() => expect(publishCompetition).toHaveBeenCalled());
  });

  it("shows the saved draft the server returned", async () => {
    const saved = { ...leagueDraft, competition: { ...leagueDraft.competition, name: "Liga Sur" } };
    updateCompetitionDraft.mockResolvedValue(saved);
    const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    const draftKey = queryKeys.competitions.draft("org-1", "competition-1");
    queryClient.setQueryData(draftKey, leagueDraft);
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () => useUpdateCompetitionDraftMutation("org-1", "competition-1"),
      { wrapper },
    );

    await act(() => result.current.mutateAsync({} as never));

    expect(queryClient.getQueryData<CompetitionDraftDto>(draftKey)?.competition.name).toBe(
      "Liga Sur",
    );
  });
});
