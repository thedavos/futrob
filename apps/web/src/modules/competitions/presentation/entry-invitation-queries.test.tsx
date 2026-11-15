// @vitest-environment jsdom

import type { PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type {
  ListSentEntryInvitationsResponse,
  SentEntryInvitationDto,
} from "@futrob/api-contracts";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import { useEntryInvitationCommands } from "./entry-invitation-queries.ts";

const revokeEntryInvitation = vi.fn<() => Promise<void>>();
const listSentEntryInvitations = vi.fn<() => Promise<ListSentEntryInvitationsResponse>>();

vi.mock("./entry-invitations-browser-client.ts", () => ({
  revokeEntryInvitation: () => revokeEntryInvitation(),
  listSentEntryInvitations: () => listSentEntryInvitations(),
}));

const sentKey = queryKeys.competitions.entryInvitations("org-1", "competition-1");

function invitation(id: string): SentEntryInvitationDto {
  return {
    id,
    inviteeActorId: `actor-${id}`,
    inviteeLabel: `Capitán ${id}`,
    message: null,
    status: "pending",
    createdAt: "2026-10-20T00:00:00.000Z",
    expiresAt: null,
    respondedAt: null,
    acceptedEntryId: null,
  };
}

function renderCommands() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
  queryClient.setQueryData<ListSentEntryInvitationsResponse>(sentKey, {
    invitations: [invitation("a"), invitation("b")],
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useEntryInvitationCommands("org-1", "competition-1"), {
    wrapper,
  });
  const statuses = () =>
    queryClient
      .getQueryData<ListSentEntryInvitationsResponse>(sentKey)
      ?.invitations.map((sent) => [sent.id, sent.status]);
  return { result, statuses };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("revoking a sent entry invitation", () => {
  it("shows only that invitation as revoked before the server answers", async () => {
    revokeEntryInvitation.mockReturnValue(new Promise(() => undefined));
    const { result, statuses } = renderCommands();

    act(() => result.current.revoke.mutate("a"));

    await waitFor(() =>
      expect(statuses()).toEqual([
        ["a", "revoked"],
        ["b", "pending"],
      ]),
    );
  });

  it("shows the invitation pending again when revoking fails", async () => {
    revokeEntryInvitation.mockRejectedValue(new Error("already decided"));
    listSentEntryInvitations.mockReturnValue(new Promise(() => undefined));
    const { result, statuses } = renderCommands();

    await act(() => result.current.revoke.mutateAsync("a").catch(() => undefined));

    expect(statuses()).toEqual([
      ["a", "pending"],
      ["b", "pending"],
    ]);
    await waitFor(() => expect(result.current.revoke.isError).toBe(true));
  });
});
