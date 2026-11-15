import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
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

const meta = {
  title: "Product/Shared/Legal document",
  component: LegalDocumentPage,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof LegalDocumentPage>;

export default meta;

type Story = StoryObj<typeof meta>;

function renderDocument(documentId: LegalDocumentId) {
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
  const router = createRouter({
    routeTree: root.addChildren([terms, privacy, refunds]),
    history: createMemoryHistory({ initialEntries: [`/${documentId}`] }),
  });
  return (
    <I18nProvider initialLocale="es">
      <RouterProvider router={router} />
    </I18nProvider>
  );
}

export const Terms: Story = {
  args: { documentId: LEGAL_DOCUMENT_ID.terms },
  render: () => renderDocument(LEGAL_DOCUMENT_ID.terms),
  play: async ({ canvasElement }) => {
    const view = within(canvasElement);
    await expect(view.getByRole("heading", { name: "Términos de servicio" })).toBeTruthy();
  },
};

export const Privacy: Story = {
  args: { documentId: LEGAL_DOCUMENT_ID.privacy },
  render: () => renderDocument(LEGAL_DOCUMENT_ID.privacy),
  play: async ({ canvasElement }) => {
    const view = within(canvasElement);
    await expect(view.getByRole("heading", { name: "Política de privacidad" })).toBeTruthy();
    const deletion = view.getByRole("heading", { name: "Eliminación de la cuenta" });
    await expect(deletion.closest("section")?.id).toBe("account-deletion");
  },
};

export const Refunds: Story = {
  args: { documentId: LEGAL_DOCUMENT_ID.refunds },
  render: () => renderDocument(LEGAL_DOCUMENT_ID.refunds),
  play: async ({ canvasElement }) => {
    const view = within(canvasElement);
    await expect(view.getByRole("heading", { name: "Reembolsos" })).toBeTruthy();
  },
};

export const PrivacyNarrow: Story = {
  args: { documentId: LEGAL_DOCUMENT_ID.privacy },
  render: () => renderDocument(LEGAL_DOCUMENT_ID.privacy),
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
