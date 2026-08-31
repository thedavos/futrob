// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { createTranslator } from "@/shared/presentation/i18n/translate.ts";
import { PlayerProfileEvolutionChart } from "./player-profile-evolution-chart.tsx";
import { formatEvolutionPointLabel } from "./player-profile-evolution-point-label.tsx";
import {
  gameProfileEmptyEvolutionFixture,
  gameProfileReadyFixture,
  gameProfileUnavailableRatingFixture,
} from "./player-statistics-page.fixtures.ts";

vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children?: ReactNode }) => (
      <actual.ResponsiveContainer height={240} width={640}>
        {children}
      </actual.ResponsiveContainer>
    ),
  };
});

const esNumber = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

describe("formatEvolutionPointLabel", () => {
  it("formats rating with the locale number format", () => {
    expect(formatEvolutionPointLabel(7.2, esNumber)).toBe("7,2");
  });
});

describe("PlayerProfileEvolutionChart", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows the rating number on every point that has one", () => {
    stubResizeObserver();
    const { container } = renderChart(gameProfileReadyFixture());

    expect(screen.getByRole("heading", { name: "Rating por partido" })).toBeTruthy();
    expect(screen.queryByRole("tab")).toBeNull();
    expect(pointLabelTexts(container)).toEqual(["6,4", "7,1", "7,8", "7,2"]);
  });

  it("keeps date and outcome in the accessible list when a rating is missing", () => {
    stubResizeObserver();
    renderChart(gameProfileReadyFixture());

    const items = [...screen.getByRole("list").querySelectorAll("li")].map(
      (node) => node.textContent ?? "",
    );
    expect(items.some((item) => item.includes("Sin datos"))).toBe(true);
    expect(items).toHaveLength(5);
  });

  it("shows the empty copy when there are no evolution points", () => {
    stubResizeObserver();
    renderChart(gameProfileEmptyEvolutionFixture());

    expect(screen.getByText("Aún no hay partidos para trazar tu rating.")).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("shows the unavailable copy when every rating is missing", () => {
    stubResizeObserver();
    renderChart(gameProfileUnavailableRatingFixture());

    expect(screen.getByText("Estos partidos no incluyen rating.")).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
  });
});

function stubResizeObserver(): void {
  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    configurable: true,
    value: ResizeObserverStub,
  });
}

function renderChart(profile: ReturnType<typeof gameProfileReadyFixture>) {
  return render(
    <I18nProvider initialLocale="es">
      <PlayerProfileEvolutionChart
        dateFormat={new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "numeric" })}
        numberFormat={esNumber}
        profile={profile}
        t={createTranslator("es")}
      />
    </I18nProvider>,
  );
}

function pointLabelTexts(container: HTMLElement): readonly string[] {
  return [...container.querySelectorAll("[data-slot='evolution-point-value']")].map(
    (node) => node.textContent ?? "",
  );
}
