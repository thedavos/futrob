import { render, screen, waitFor } from "@testing-library/react";
import { useQuery } from "@tanstack/react-query";
import { act } from "react";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { clearSession, getSession, saveSession } from "@/modules/identity/session-store";
import { createMobileQueryClient } from "./create-query-client";
import { mobileQueryKeys } from "./query-keys";
import { SessionQueryClientProvider, useSessionGeneration } from "./session-query-client-provider";

const ana = { token: "token-ana", user: { id: "actor-ana", name: "Ana", email: "ana@club.mx" } };
const beto = {
  token: "token-beto",
  user: { id: "actor-beto", name: "Beto", email: "beto@club.mx" },
};

function SignedInName() {
  const session = useSessionGeneration();
  const query = useQuery({
    queryKey: mobileQueryKeys.playerProfile(session),
    queryFn: async () => (await getSession())?.user.name ?? "nadie",
  });
  return <p>{query.data ?? "cargando"}</p>;
}

afterEach(async () => {
  await clearSession();
});

describe("SessionQueryClientProvider", () => {
  it("moves a screen that stays mounted to the new session's data", async () => {
    await saveSession(ana);
    const queryClient = createMobileQueryClient();
    render(
      <SessionQueryClientProvider client={queryClient}>
        <SignedInName />
      </SessionQueryClientProvider>,
    );
    expect(await screen.findByText("Ana")).toBeInTheDocument();

    await act(() => saveSession(beto));

    expect(await screen.findByText("Beto")).toBeInTheDocument();
    expect(screen.queryByText("Ana")).toBeNull();
  });

  it("keeps data that does not belong to a session", async () => {
    await saveSession(ana);
    const queryClient = createMobileQueryClient();
    queryClient.setQueryData(["public-catalog"], ["fc26"]);
    render(
      <SessionQueryClientProvider client={queryClient}>
        <SignedInName />
      </SessionQueryClientProvider>,
    );
    expect(await screen.findByText("Ana")).toBeInTheDocument();

    await act(() => clearSession());

    await waitFor(() => expect(screen.getByText("nadie")).toBeInTheDocument());
    expect(queryClient.getQueryData(["public-catalog"])).toEqual(["fc26"]);
  });
});
