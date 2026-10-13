// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { AuthResumeProvider, useAuthResume } from "./auth-resume.tsx";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useRouter: () => ({}),
}));
vi.mock("@/modules/identity/presentation/navigate-after-auth.ts", () => ({
  navigateAfterAuth: async () => undefined,
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
});
