// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  defaultParseSearch,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import {
  onboardingHandoffFromSearch,
  onboardingHandoffSearchSchema,
} from "@/modules/identity/presentation/onboarding/onboarding-handoff.ts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { FinalCtaSection } from "./final-cta-section.tsx";
import { LandingHeader } from "./landing-header.tsx";
import { LandingHero } from "./landing-hero.tsx";

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderLanding() {
  const root = createRootRoute({ component: () => <Outlet /> });
  const home = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => (
      <>
        <LandingHeader />
        <LandingHero />
        <FinalCtaSection />
      </>
    ),
  });
  const signup = createRoute({
    getParentRoute: () => root,
    path: "/signup",
    component: () => <p>signup</p>,
  });
  const router = createRouter({
    routeTree: root.addChildren([home, signup]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  return render(
    <I18nProvider initialLocale="es">
      <RouterProvider router={router} />
    </I18nProvider>,
  );
}

describe("landing «Crear competición»", () => {
  it("signs up into the organization step from the header, the hero and the final CTA", async () => {
    renderLanding();

    const anchors = (await screen.findAllByText("Crear competición")).map((label) =>
      label.closest("a"),
    );

    expect(anchors).toHaveLength(3);
    for (const anchor of anchors) {
      const signup = new URL(anchor?.getAttribute("href") ?? "", "https://futrob.test");
      expect(signup.pathname).toBe("/signup");
      const onboarding = new URL(
        signup.searchParams.get("redirectTo") ?? "",
        "https://futrob.test",
      );
      expect(onboarding.pathname).toBe("/onboarding/organization");
      expect(
        onboardingHandoffFromSearch(
          onboardingHandoffSearchSchema.parse(defaultParseSearch(onboarding.search)),
        ),
      ).toEqual({ kind: "organizer" });
    }
  });
});
