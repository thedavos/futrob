// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import { PlayerOnboardingGuard } from "./player-onboarding-guard.tsx";

const mocks = vi.hoisted(() => ({
  getOnboardingStatus: vi.fn<() => Promise<{ completed: boolean }>>(),
  navigate: vi.fn<() => Promise<void>>(() => Promise.resolve()),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock("@/modules/identity/presentation/identity-browser-client.ts", () => ({
  identityBrowserClient: { getOnboardingStatus: mocks.getOnboardingStatus },
}));

beforeEach(() => {
  mocks.getOnboardingStatus.mockReset();
  mocks.navigate.mockClear();
});

afterEach(cleanup);

describe("PlayerOnboardingGuard", () => {
  it("reveals the detail only after completed onboarding is confirmed", async () => {
    mocks.getOnboardingStatus.mockResolvedValue({ completed: true });

    renderGuard();

    expect(screen.getByText("Comprobando tu onboarding…")).toBeTruthy();
    expect(await screen.findByText("protected detail")).toBeTruthy();
  });

  it("redirects incomplete onboarding without revealing the detail", async () => {
    mocks.getOnboardingStatus.mockResolvedValue({ completed: false });

    renderGuard();

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith({ to: "/onboarding", replace: true });
    });
    expect(screen.queryByText("protected detail")).toBeNull();
  });
});

function renderGuard() {
  return render(
    <QueryTestProvider>
      <I18nProvider initialLocale="es">
        <PlayerOnboardingGuard>
          <div>protected detail</div>
        </PlayerOnboardingGuard>
      </I18nProvider>
    </QueryTestProvider>,
  );
}
