// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { createTranslator } from "@/shared/presentation/i18n/translate.ts";
import { PlayerProfileAttributes } from "./player-profile-attributes.tsx";
import { gameProfileReadyFixture } from "./player-statistics-page.fixtures.ts";

vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children?: ReactNode }) => (
      <actual.ResponsiveContainer height={272} width={320}>
        {children}
      </actual.ResponsiveContainer>
    ),
  };
});

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

describe("PlayerProfileAttributes", () => {
  afterEach(() => {
    cleanup();
  });

  it("selects a category and shows only that detail", async () => {
    Object.defineProperty(window, "ResizeObserver", {
      writable: true,
      configurable: true,
      value: ResizeObserverStub,
    });
    const user = userEvent.setup();
    const t = createTranslator("es");
    const numberFormat = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });
    const percentFormat = new Intl.NumberFormat("es-ES", {
      style: "percent",
      maximumFractionDigits: 0,
    });

    render(
      <I18nProvider initialLocale="es">
        <PlayerProfileAttributes
          numberFormat={numberFormat}
          percentFormat={percentFormat}
          profile={gameProfileReadyFixture()}
          t={t}
        />
      </I18nProvider>,
    );

    expect(screen.getByRole("heading", { name: "Disciplina · 88" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Pase · 68" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Pase 68" }));
    expect(screen.getByRole("heading", { name: "Pase · 68" })).toBeTruthy();
    expect(screen.getByText("Éxito de pase")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Disciplina · 88" })).toBeNull();
  });

  it("stacks each category score under the radar axis label", () => {
    Object.defineProperty(window, "ResizeObserver", {
      writable: true,
      configurable: true,
      value: ResizeObserverStub,
    });
    const t = createTranslator("es");
    const numberFormat = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });
    const percentFormat = new Intl.NumberFormat("es-ES", {
      style: "percent",
      maximumFractionDigits: 0,
    });

    const { container } = render(
      <I18nProvider initialLocale="es">
        <PlayerProfileAttributes
          numberFormat={numberFormat}
          percentFormat={percentFormat}
          profile={gameProfileReadyFixture()}
          t={t}
        />
      </I18nProvider>,
    );

    expect(radarAxisTicks(container)).toEqual([
      { label: "Ataque", score: "72" },
      { label: "Pase", score: "68" },
      { label: "Defensa", score: "41" },
      { label: "Impacto", score: "77" },
      { label: "Disciplina", score: "88" },
    ]);
  });
});

function radarAxisTicks(container: HTMLElement): readonly { label: string; score: string }[] {
  return [...container.querySelectorAll("[data-slot='player-radar-axis-tick']")].map((text) => {
    const [label, score] = [...text.querySelectorAll("tspan")].map(
      (node) => node.textContent ?? "",
    );
    return { label: label ?? "", score: score ?? "" };
  });
}
