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
import { expect, within } from "storybook/test";
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
  loading: { kind: "loading" },
  denied: { kind: "denied" },
  error: { kind: "error", retry: noop },
} satisfies Record<string, PlanAdminState>;

type StoryArgs = { readonly scenario: keyof typeof STATES; readonly locale: Locale };

function PlanAdminStory({ locale, scenario }: StoryArgs) {
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
        <div {...applyProps(undefined, undefined, styles.frame)}>
          <RouterProvider router={router} />
        </div>
      </I18nProvider>
    </QueryClientProvider>
  );
}

const meta = {
  title: "Product/Admin/Plans and requests",
  parameters: { layout: "fullscreen" },
  args: { scenario: "queue", locale: "es" },
  argTypes: {
    scenario: { control: "select", options: Object.keys(STATES) },
    locale: { control: "inline-radio", options: ["es", "en"] },
  },
  render: (args) => <PlanAdminStory key={`${args.scenario}-${args.locale}`} {...args} />,
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
export const Loading: Story = { name: "Cargando", args: { scenario: "loading" } };
export const Denied: Story = { name: "Sin permiso", args: { scenario: "denied" } };
export const LoadError: Story = { name: "Error", args: { scenario: "error" } };
