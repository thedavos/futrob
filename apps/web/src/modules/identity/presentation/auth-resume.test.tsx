// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { AuthResumeProvider, useAuthResume } from "./auth-resume.tsx";

const session = vi.hoisted(() => {
  const state = { data: null as { user: { id: string } } | null, signedInOnServer: false };
  return {
    state,
    navigatedWith: [] as Array<typeof state.data>,
    atom: {
      get: () => ({
        data: state.data,
        isPending: false,
        refetch: async () => {
          state.data = state.signedInOnServer ? { user: { id: "user-1" } } : null;
        },
      }),
    },
  };
});

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useRouter: () => ({}),
}));
vi.mock("@/modules/identity/auth-client.ts", () => ({
  authClient: { $store: { atoms: { session: session.atom } } },
}));
vi.mock("@/modules/identity/presentation/navigate-after-auth.ts", () => ({
  navigateAfterAuth: async () => {
    session.navigatedWith.push(session.state.data);
  },
}));

afterEach(cleanup);

function SignedIn() {
  const { afterAuthenticated } = useAuthResume();
  return <button onClick={() => void afterAuthenticated("login")}>Entrar</button>;
}

describe("AuthResumeProvider", () => {
  it("forgets what the previous session cached once a new identity signs in", async () => {
    const queryClient = new QueryClient();
    const candidatesKey = ["encounters", "candidates", "encounter-1"];
    queryClient.setQueryData(candidatesKey, { status: "ready", candidates: ["m-1"] });
    render(
      <QueryClientProvider client={queryClient}>
        <AuthResumeProvider redirectTo={undefined}>
          <SignedIn />
        </AuthResumeProvider>
      </QueryClientProvider>,
    );
    expect(queryClient.getQueryData(candidatesKey)).toEqual({
      status: "ready",
      candidates: ["m-1"],
    });

    await userEvent.setup().click(screen.getByRole("button", { name: "Entrar" }));

    expect(queryClient.getQueryData(candidatesKey)).toBeUndefined();
  });

  it("enters the app with the new session, not the signed-out one a public page read", async () => {
    // The landing read the session while signed out; nothing watched the store during sign-up.
    session.state.data = null;
    session.state.signedInOnServer = true;
    session.navigatedWith.length = 0;
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AuthResumeProvider redirectTo="/onboarding/club">
          <SignedIn />
        </AuthResumeProvider>
      </QueryClientProvider>,
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "Entrar" }));

    expect(session.navigatedWith).toEqual([{ user: { id: "user-1" } }]);
  });
});
