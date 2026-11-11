// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { LegalDocumentPage } from "./legal-document-page.tsx";
import { LEGAL_DOCUMENT_ID, type LegalDocumentId } from "./legal-hrefs.ts";

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderDocument(documentId: LegalDocumentId, locale: "es" | "en" = "es") {
  const root = createRootRoute({ component: Outlet });
  const terms = createRoute({
    getParentRoute: () => root,
    path: "/terms",
    component: () => <LegalDocumentPage documentId={LEGAL_DOCUMENT_ID.terms} />,
  });
  const privacy = createRoute({
    getParentRoute: () => root,
    path: "/privacy",
    component: () => <LegalDocumentPage documentId={LEGAL_DOCUMENT_ID.privacy} />,
  });
  const refunds = createRoute({
    getParentRoute: () => root,
    path: "/refunds",
    component: () => <LegalDocumentPage documentId={LEGAL_DOCUMENT_ID.refunds} />,
  });
  const href = `/${documentId}`;
  const router = createRouter({
    routeTree: root.addChildren([terms, privacy, refunds]),
    history: createMemoryHistory({ initialEntries: [href] }),
  });
  return render(
    <I18nProvider initialLocale={locale}>
      <RouterProvider router={router} />
    </I18nProvider>,
  );
}

describe("LegalDocumentPage", () => {
  it("shows the draft banner, last-updated date, and account-deletion heading", async () => {
    renderDocument(LEGAL_DOCUMENT_ID.privacy);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Política de privacidad" }),
    ).toBeTruthy();
    expect(screen.getByText("Última actualización: 10 de noviembre de 2026")).toBeTruthy();
    expect(screen.getByRole("alert")).toHaveTextContent("Borrador pendiente de revisión legal");
    const deletion = screen.getByRole("heading", {
      level: 2,
      name: "Eliminación de la cuenta",
    });
    expect(deletion.closest("section")?.id).toBe("account-deletion");
    expect(screen.getByRole("link", { name: "Términos de servicio" })).toHaveAttribute(
      "href",
      "/terms",
    );
    expect(screen.getByRole("link", { name: "Reembolsos" })).toHaveAttribute("href", "/refunds");
  });

  it("renders English terms copy without claiming legal counsel", async () => {
    renderDocument(LEGAL_DOCUMENT_ID.terms, "en");

    expect(await screen.findByRole("heading", { level: 1, name: "Terms of service" })).toBeTruthy();
    expect(screen.getByText("Last updated: November 10, 2026")).toBeTruthy();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This text describes how Futrob works today. It is not legal advice",
    );
  });
});
