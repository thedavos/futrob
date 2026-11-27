// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { CompetitionFixturePageView } from "./competition-fixture-page.tsx";

afterEach(() => {
  cleanup();
});

function renderLoading(locale: "es" | "en" = "es") {
  render(
    <I18nProvider initialLocale={locale} persistLocale={async () => undefined}>
      <CompetitionFixturePageView
        competitionId="competition-1"
        organizationId="org-1"
        state={{ kind: "loading" }}
      />
    </I18nProvider>,
  );
}

describe("FixtureCalendarSkeleton", () => {
  it("mirrors the calendar chrome with a status label and no focusable bones", () => {
    renderLoading();

    const status = screen.getByRole("status", { name: "Cargando el calendario" });
    expect(status).toHaveTextContent("Cargando el calendario");
    expect(status.closest("[aria-busy='true']")?.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText("Agenda")).toBeTruthy();
    expect(screen.getByText("Jornadas")).toBeTruthy();
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(document.querySelectorAll("[data-slot='skeleton']").length).toBeGreaterThan(10);
    expect(document.querySelector("[data-slot='skeleton'][tabindex]")).toBeNull();
    // Chromium makes overflowing scrollers keyboard-focusable; `inert` keeps the
    // decorative index and panels out of the Tab order while they load.
    const hidden = Array.from(document.querySelectorAll("[aria-hidden='true']")).filter(
      (node) => node.parentElement?.closest("[aria-hidden='true']") === null,
    );
    expect(hidden.length).toBeGreaterThan(0);
    for (const node of hidden) expect(node.hasAttribute("inert")).toBe(true);
  });

  it("localizes the loading status in English", () => {
    renderLoading("en");

    expect(screen.getByRole("status", { name: "Loading the schedule" })).toHaveTextContent(
      "Loading the schedule",
    );
    expect(screen.getByText("Agenda")).toBeTruthy();
    expect(screen.getByText("Rounds")).toBeTruthy();
  });
});
