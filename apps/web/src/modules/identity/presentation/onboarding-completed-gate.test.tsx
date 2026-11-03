// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import { OnboardingCompletedGate } from "./onboarding-completed-gate.tsx";

const mocks = vi.hoisted(() => ({
  getOnboardingStatus: vi.fn<() => Promise<{ completed: boolean }>>(),
  navigate: vi.fn<(input: { readonly to: string; readonly replace?: boolean }) => void>(),
}));

vi.mock("@tanstack/react-router", () => ({
  Navigate: (props: { readonly to: string; readonly replace?: boolean }) => {
    mocks.navigate(props);
    return null;
  },
}));

vi.mock("@/modules/identity/presentation/identity-browser-client.ts", () => ({
  identityBrowserClient: { getOnboardingStatus: mocks.getOnboardingStatus },
}));

beforeEach(() => {
  mocks.getOnboardingStatus.mockReset();
  mocks.navigate.mockClear();
});

afterEach(cleanup);

describe("OnboardingCompletedGate", () => {
  it("reveals the detail only after completed onboarding is confirmed", async () => {
    mocks.getOnboardingStatus.mockResolvedValue({ completed: true });

    renderGuard();

    expect(screen.getByText("Cargando tus datos…")).toBeTruthy();
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

  it("offers a retry instead of redirecting when the check fails", async () => {
    mocks.getOnboardingStatus.mockRejectedValueOnce(new Error("network"));
    mocks.getOnboardingStatus.mockResolvedValueOnce({ completed: true });

    renderGuard();

    fireEvent.click(await screen.findByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("protected detail")).toBeTruthy();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});

function renderGuard() {
  return render(
    <QueryTestProvider>
      <I18nProvider initialLocale="es">
        <OnboardingCompletedGate>
          <div>protected detail</div>
        </OnboardingCompletedGate>
      </I18nProvider>
    </QueryTestProvider>,
  );
}
