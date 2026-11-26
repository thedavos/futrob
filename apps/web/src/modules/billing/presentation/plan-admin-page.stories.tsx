import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, userEvent, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import { applyProps } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { PlanAdminPageView, type PlanAdminState } from "./plan-admin-page.tsx";

const styles = stylex.create({
  frame: {
    minHeight: "100svh",
    backgroundColor: colors.background,
    paddingInline: { default: "1rem", [media.lg]: "2.5rem" },
    paddingBlock: "1.5rem",
  },
  narrow: {
    width: 390,
    paddingInline: "1rem",
  },
});

const noop = () => undefined;

const STATES = {
  queue: {
    kind: "ready",
    requests: [
      {
        organizationId: "org-1",
        organizationName: "Liga Norte",
        planKey: "pro",
        requestedAt: "2026-11-09T10:00:00.000Z",
      },
      {
        organizationId: "org-2",
        organizationName: "Copa Sur FC",
        planKey: "league",
        requestedAt: "2026-11-08T16:30:00.000Z",
      },
    ],
  },
  empty: { kind: "ready", requests: [] },
  checking: { kind: "checking" },
  loading: { kind: "loading" },
  denied: { kind: "denied" },
  error: { kind: "error", retry: noop },
} satisfies Record<string, PlanAdminState>;

type StoryArgs = {
  readonly scenario: keyof typeof STATES;
  readonly locale: Locale;
  readonly narrow?: boolean;
};

function PlanAdminStory({ locale, narrow = false, scenario }: StoryArgs) {
  const queryClient = useMemo(() => new QueryClient(), []);
  const router = useMemo(() => {
    const rootRoute = createRootRoute({ component: Outlet });
    const page = createRoute({
      getParentRoute: () => rootRoute,
      path: "/admin/billing",
      component: () => <PlanAdminPageView state={STATES[scenario]} />,
    });
    const orgPlan = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/settings/plan",
      component: () => <p>Destino</p>,
    });
    return createRouter({
      routeTree: rootRoute.addChildren([page, orgPlan]),
      history: createMemoryHistory({ initialEntries: ["/admin/billing"] }),
    });
  }, [scenario]);
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider initialLocale={locale} persistLocale={async () => undefined}>
        <div {...applyProps(undefined, undefined, styles.frame, narrow && styles.narrow)}>
          <RouterProvider router={router} />
        </div>
      </I18nProvider>
    </QueryClientProvider>
  );
}

async function expectLayoutSkeleton(canvasElement: HTMLElement, statusName: string): Promise<void> {
  const canvas = within(canvasElement);
  const status = await canvas.findByRole("status");
  await expect(status).toHaveTextContent(statusName);
  await expect(status.closest("[aria-busy='true']")).toBeNull();
  await expect(canvas.getByRole("heading", { name: "Asignar un plan" })).toBeVisible();
  await expect(canvas.getByRole("heading", { name: "Solicitudes pendientes" })).toBeVisible();
  await expect(canvas.getByRole("columnheader", { name: "Organización" })).toBeVisible();
  await expect(canvas.getByRole("columnheader", { name: "Plan pedido" })).toBeVisible();
  await expect(canvas.getByRole("columnheader", { name: "Pedida el" })).toBeVisible();
  await expect(canvas.getByRole("columnheader", { name: "Acción" })).toBeVisible();
  await expect(canvas.queryByRole("button", { name: "Asignar plan" })).toBeNull();
  const queueTable = canvasElement.querySelector("[data-slot='table-container']");
  await expect(queueTable).toHaveAttribute("tabindex", "-1");
  await userEvent.tab();
  await expect(queueTable).not.toHaveFocus();
}

const meta = {
  title: "Product/Admin/Plans and requests",
  parameters: { layout: "fullscreen" },
  args: { scenario: "queue", locale: "es" },
  argTypes: {
    scenario: { control: "select", options: Object.keys(STATES) },
    locale: { control: "inline-radio", options: ["es", "en"] },
  },
  render: (args) => (
    <PlanAdminStory key={`${args.scenario}-${args.locale}-${String(args.narrow)}`} {...args} />
  ),
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

export const Queue: Story = {
  name: "Solicitudes pendientes",
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Liga Norte")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Asignar plan" })).toBeVisible();
  },
};

export const QueueEnglish: Story = {
  name: "Pending requests · EN",
  args: { locale: "en" },
};

export const Empty: Story = { name: "Sin solicitudes", args: { scenario: "empty" } };

export const Checking: Story = {
  name: "Comprobando permisos",
  args: { scenario: "checking" },
  play: async ({ canvasElement }) => {
    await expectLayoutSkeleton(canvasElement, "Comprobando permisos…");
  },
};

export const Loading: Story = {
  name: "Cargando",
  args: { scenario: "loading" },
  play: async ({ canvasElement }) => {
    await expectLayoutSkeleton(canvasElement, "Cargando las solicitudes…");
  },
};

export const LoadingNarrow: Story = {
  name: "Cargando · 390",
  args: { scenario: "loading", narrow: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("status")).toHaveTextContent("Cargando las solicitudes…");
    await expect(canvas.getByRole("heading", { name: "Asignar un plan" })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Solicitudes pendientes" })).toBeVisible();
  },
};

export const Denied: Story = { name: "Sin permiso", args: { scenario: "denied" } };
export const LoadError: Story = { name: "Error", args: { scenario: "error" } };
