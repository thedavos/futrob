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
import { NotFoundPage } from "./not-found-page.tsx";

const meta = {
  title: "Product/Shared/Not found",
  component: NotFoundPage,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof NotFoundPage>;

export default meta;

type Story = StoryObj<typeof meta>;

function renderNotFound(audience: "visitor" | "member") {
  const root = createRootRoute({
    component: Outlet,
    notFoundComponent: () => <NotFoundPage audience={audience} />,
  });
  const home = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => <p>home</p>,
  });
  const space = createRoute({
    getParentRoute: () => root,
    path: "/player",
    component: () => <p>space</p>,
  });
  const router = createRouter({
    routeTree: root.addChildren([home, space]),
    history: createMemoryHistory({ initialEntries: ["/missing-page"] }),
  });
  return (
    <I18nProvider initialLocale="es">
      <RouterProvider router={router} />
    </I18nProvider>
  );
}

export const Visitor: Story = {
  args: { audience: "visitor" },
  render: () => renderNotFound("visitor"),
  play: async ({ canvasElement }) => {
    const view = within(canvasElement);
    await expect(
      view.getByRole("heading", { name: "No encontramos esta página" }),
    ).toBeTruthy();
    await expect(view.getByRole("link", { name: "Volver al inicio" })).toHaveAttribute(
      "href",
      "/",
    );
  },
};

export const Member: Story = {
  args: { audience: "member" },
  render: () => renderNotFound("member"),
  play: async ({ canvasElement }) => {
    const view = within(canvasElement);
    await expect(view.getByRole("link", { name: "Ir a tu espacio" })).toHaveAttribute(
      "href",
      "/player",
    );
  },
};
