// @vitest-environment jsdom

import { StrictMode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { OnboardingStoryRouter, createFakeOnboardingGateway } from "./onboarding-story-router.tsx";

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("OnboardingFlowProvider initialization", () => {
  it("renders a legacy actor from route data under StrictMode", async () => {
    const gateway = createFakeOnboardingGateway({
      path: null,
      currentStep: "intention",
    });

    render(
      <StrictMode>
        <OnboardingStoryRouter gateway={gateway} initialPath="/onboarding/intention" />
      </StrictMode>,
    );

    expect(
      await screen.findByRole("heading", { name: "¿Qué quieres hacer primero?" }),
    ).toBeTruthy();
    expect(screen.queryByText("Recuperando tu progreso…")).toBeNull();
  });

  it("resumes the persisted screen from a new router entry", async () => {
    const gateway = createFakeOnboardingGateway({
      path: "player",
      currentStep: "game-account",
    });

    render(
      <StrictMode>
        <OnboardingStoryRouter gateway={gateway} initialPath="/onboarding/intention" />
      </StrictMode>,
    );

    expect(await screen.findByRole("heading", { name: "Vincula tu cuenta de juego" })).toBeTruthy();
  });
});
