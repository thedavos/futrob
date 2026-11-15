// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { OrganizationPlan } from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  freeEntitlementsFixture,
  leagueEntitlementsFixture,
  proEntitlementsFixture,
} from "./organization-plan.fixtures.ts";
import { PricingPage } from "./pricing-page.tsx";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children?: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

const PLANS: readonly OrganizationPlan[] = [
  { key: "free", version: 1, entitlements: freeEntitlementsFixture },
  { key: "pro", version: 1, entitlements: proEntitlementsFixture },
  { key: "league", version: 1, entitlements: leagueEntitlementsFixture },
];

function renderPage(plans: readonly OrganizationPlan[] | null) {
  render(
    <I18nProvider initialLocale="es">
      <PricingPage plans={plans} />
    </I18nProvider>,
  );
}

function plan(name: string) {
  return within(screen.getByRole("region", { name }));
}

afterEach(cleanup);

describe("PricingPage", () => {
  it("shows each plan's monthly price and marks only Pro as recommended", () => {
    renderPage(PLANS);
    expect(plan("Gratis").getByText("$0")).toBeTruthy();
    expect(plan("Pro").getByText("$9")).toBeTruthy();
    expect(plan("Liga").getByText("$29")).toBeTruthy();
    expect(screen.getAllByText("Recomendado")).toHaveLength(1);
    expect(plan("Pro").getByText("Recomendado")).toBeTruthy();
  });

  it("lists every format on every plan and names what a plan leaves out", () => {
    renderPage(PLANS);
    // The card's subgrid reserves exactly these 14 rows; see `pricing-plan-card.tsx`.
    for (const name of ["Gratis", "Pro", "Liga"]) {
      expect(plan(name).getAllByRole("listitem")).toHaveLength(14);
      expect(plan(name).getByText(/Formato: Liga \+ playoffs/)).toBeTruthy();
    }
    expect(plan("Gratis").getByText("Formato: Liga").textContent).not.toContain("No incluido");
    expect(plan("Gratis").getByText(/Formato: Grupos \+ eliminación/).textContent).toContain(
      "No incluido",
    );
    expect(plan("Pro").getByText("Formato: Sistema suizo")).toBeTruthy();
    expect(plan("Liga").getByText("Formato: Sistema suizo")).toBeTruthy();
    expect(plan("Gratis").getByText(/Formato: Sistema suizo/).textContent).toContain("No incluido");
    // Three formats, automatic sync, ranking, premium and organizer analytics.
    expect(plan("Gratis").getAllByText(/\(No incluido\)/)).toHaveLength(7);
    expect(plan("Pro").queryByText(/\(No incluido\)/)).toBeNull();
  });

  it("marks entitlements without a consumer as coming soon instead of selling them", () => {
    renderPage(PLANS);
    for (const name of ["Pro", "Liga"]) {
      const row = (label: string) => plan(name).getByText(label).closest("li");
      expect(
        within(row("Sincronización automática con EA")!).getByText("Próximamente"),
      ).toBeTruthy();
      expect(
        within(
          plan(name)
            .getByText(/^Portal público con/)
            .closest("li")!,
        ).getByText("Próximamente"),
      ).toBeTruthy();
      expect(within(row("Ranking de rendimiento 0–100")!).queryByText("Próximamente")).toBeNull();
    }
    // Free keeps what exists today: the Futrob-branded portal, and no promise of auto sync.
    expect(plan("Gratis").queryByText("Próximamente")).toBeNull();
    expect(plan("Gratis").getByText("Portal público con marca Futrob")).toBeTruthy();
  });

  it("explains the request-based manual activation and sends every plan to signup", () => {
    renderPage(PLANS);
    expect(plan("Pro").getByText(/pides Pro desde tu organización/)).toBeTruthy();
    expect(plan("Pro").getByRole("button", { name: "Crear cuenta" }).getAttribute("href")).toBe(
      "/signup",
    );
    expect(
      plan("Gratis").getByRole("button", { name: "Empezar gratis" }).getAttribute("href"),
    ).toBe("/signup");
  });

  it("keeps the integrity promise when the catalog fails to load", () => {
    renderPage(null);
    expect(screen.getByText(/No pudimos cargar los planes/)).toBeTruthy();
    expect(screen.getByRole("list", { name: "Incluido en todos los planes" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Pro" })).toBeNull();
  });
});
