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
import { expect, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import { applyProps } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { OrganizationPlanPageView, type OrganizationPlanState } from "./organization-plan-page.tsx";
import { freePlanFixture, proPlanFixture } from "./organization-plan.fixtures.ts";

const styles = stylex.create({
  frame: {
    minHeight: "100svh",
    backgroundColor: colors.background,
    paddingInline: { default: "1rem", [media.lg]: "2.5rem" },
    paddingBlock: "1.5rem",
  },
  narrow: { width: 360, paddingInline: "1rem" },
});

const noop = () => undefined;

const STATES = {
  free: { kind: "ready", plan: freePlanFixture },
  freeAtLimit: {
    kind: "ready",
    plan: {
      ...freePlanFixture,
      usage: { activeCompetitions: 1, staffMembers: 2 },
      quotas: [{ ...freePlanFixture.quotas[0]!, used: 60 }],
    },
  },
  pro: { kind: "ready", plan: proPlanFixture },
  loading: { kind: "loading" },
  forbidden: { kind: "forbidden" },
  error: { kind: "error", cause: "load", retry: noop },
  refreshError: { kind: "ready", plan: freePlanFixture, refreshRetry: noop },
} satisfies Record<string, OrganizationPlanState>;

type Scenario = keyof typeof STATES;

type StoryArgs = {
  readonly scenario: Scenario;
  readonly locale: Locale;
  readonly narrow?: boolean;
};

function OrganizationPlanStory({ locale, narrow = false, scenario }: StoryArgs) {
  const router = useMemo(() => {
    const rootRoute = createRootRoute({ component: Outlet });
    const page = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/settings/plan",
      component: () => <OrganizationPlanPageView state={STATES[scenario]} />,
    });
    const pricing = createRoute({
      getParentRoute: () => rootRoute,
      path: "/pricing",
      component: () => <p>Destino</p>,
    });
    return createRouter({
      routeTree: rootRoute.addChildren([page, pricing]),
      history: createMemoryHistory({ initialEntries: ["/orgs/org-1/settings/plan"] }),
    });
  }, [scenario]);
  return (
    <I18nProvider initialLocale={locale} persistLocale={async () => undefined}>
      <div {...applyProps(undefined, undefined, styles.frame, narrow && styles.narrow)}>
        <RouterProvider router={router} />
      </div>
    </I18nProvider>
  );
}

const meta = {
  title: "Product/Organization/Plan and usage",
  parameters: { layout: "fullscreen" },
  args: { scenario: "free", locale: "es" },
  argTypes: {
    scenario: { control: "select", options: Object.keys(STATES) },
    locale: { control: "inline-radio", options: ["es", "en"] },
  },
  render: (args) => <OrganizationPlanStory key={`${args.scenario}-${args.locale}`} {...args} />,
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

export const Free: Story = {
  name: "Gratis",
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Gratis")).toBeVisible();
    await expect(canvas.getByText("Plan por defecto")).toBeVisible();
    await expect(canvas.getByText("12 de 60")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Ver planes" })).toHaveAttribute(
      "href",
      "/pricing",
    );
  },
};

export const FreeAtLimit: Story = {
  name: "Gratis · cupo agotado",
  args: { scenario: "freeAtLimit" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("60 de 60")).toBeVisible();
    await expect(
      canvas.getByText(
        /Los enfrentamientos en curso se resuelven con los partidos ya sincronizados/,
      ),
    ).toBeVisible();
    await expect(canvas.getByText(/Llegaste al límite de competiciones activas/)).toBeVisible();
  },
};

export const Pro: Story = {
  name: "Pro con historial",
  args: { scenario: "pro" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Acuerdo comercial")).toBeVisible();
    await expect(canvas.getByText("Activo")).toBeVisible();
  },
};

export const ProEnglishNarrow: Story = {
  name: "Pro · EN 360",
  args: { scenario: "pro", locale: "en", narrow: true },
  parameters: { a11y: { test: "error" } },
};

export const Loading: Story = { name: "Cargando", args: { scenario: "loading" } };

export const Forbidden: Story = {
  name: "Sin permiso",
  args: { scenario: "forbidden" },
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText("No puedes ver el plan")).toBeVisible();
  },
};

export const LoadError: Story = { name: "Error", args: { scenario: "error" } };

export const RefreshError: Story = {
  name: "Error al actualizar",
  args: { scenario: "refreshError" },
};
