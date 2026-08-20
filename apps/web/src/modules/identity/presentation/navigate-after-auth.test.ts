import type { NavigateOptions, RegisteredRouter } from "@tanstack/react-router";
import { describe, expect, it, vi } from "vite-plus/test";

import { navigateAfterAuth } from "./navigate-after-auth.ts";

type NavigateFn = (opts: NavigateOptions<RegisteredRouter>) => Promise<void> | void;

describe("navigateAfterAuth", () => {
  it("prefers a safe redirectTo over default login/signup destinations", async () => {
    const navigate = vi.fn<NavigateFn>();
    const push = vi.fn<(path: string) => void>();

    await navigateAfterAuth({
      kind: "login",
      redirectTo: "/invitations/accept/token-abc",
      navigate,
      router: { history: { push } },
    });

    expect(push).toHaveBeenCalledWith("/invitations/accept/token-abc");
    expect(navigate).not.toHaveBeenCalled();
  });

  it("ignores unsafe redirectTo and uses signup onboarding default", async () => {
    const navigate = vi.fn<NavigateFn>();
    const push = vi.fn<(path: string) => void>();

    await navigateAfterAuth({
      kind: "signup",
      redirectTo: "https://evil.example",
      navigate,
      router: { history: { push } },
    });

    expect(push).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith({ to: "/onboarding" });
  });
});
