import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { expect, userEvent, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import { applyProps } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { leagueDraft, leaguePlayoffsDraft, publishedDraft } from "./competition-rules-fixtures.ts";
import { CompetitionRulesPageView, type CompetitionRulesState } from "./competition-rules-page.tsx";

const styles = stylex.create({
  frame: {
    minHeight: "100svh",
    backgroundColor: colors.background,
    paddingInline: { default: "1rem", [media.lg]: "2.5rem" },
    paddingBlock: "1.5rem",
  },
  narrow: { width: 360, paddingInline: "1rem" },
});

type Scenario =
  | "editable"
  | "readOnlyPermission"
  | "published"
  | "league"
  | "loading"
  | "forbidden"
  | "notFound"
  | "error"
  | "stale";

const STATES: Record<Scenario, CompetitionRulesState> = {
  editable: { kind: "ready", draft: leaguePlayoffsDraft, canEdit: true },
  readOnlyPermission: { kind: "ready", draft: leaguePlayoffsDraft, canEdit: false },
  published: { kind: "ready", draft: publishedDraft, canEdit: false },
  league: { kind: "ready", draft: leagueDraft, canEdit: true },
  loading: { kind: "loading" },
  forbidden: { kind: "forbidden" },
  notFound: { kind: "not_found" },
  error: { kind: "error", retry: () => undefined },
  stale: {
    kind: "ready",
    draft: leaguePlayoffsDraft,
    canEdit: true,
    refreshFailed: () => undefined,
  },
};

type StoryArgs = {
  readonly scenario: Scenario;
  readonly locale: Locale;
  readonly narrow?: boolean;
};

function RulesScenario({ scenario }: { readonly scenario: Scenario }) {
  const [recovered, setRecovered] = useState(false);
  const base = STATES[scenario];
  // The static retry callbacks recover like a real refetch: the next fetch succeeds.
  let state: CompetitionRulesState = base;
  if (recovered) state = { kind: "ready", draft: leaguePlayoffsDraft, canEdit: true };
  else if (base.kind === "error") state = { ...base, retry: () => setRecovered(true) };
  else if (base.kind === "ready" && base.refreshFailed) {
    state = { ...base, refreshFailed: () => setRecovered(true) };
  }
  return (
    <CompetitionRulesPageView competitionId="competition-1" organizationId="org-1" state={state} />
  );
}

function RulesStory({ locale, narrow = false, scenario }: StoryArgs) {
  const router = useMemo(() => {
    const rootRoute = createRootRoute({ component: Outlet });
    const rulesRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId/rules",
      component: () => <RulesScenario scenario={scenario} />,
    });
    const setupRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId/setup",
      component: () => <p>Configuración</p>,
    });
    return createRouter({
      routeTree: rootRoute.addChildren([rulesRoute, setupRoute]),
      history: createMemoryHistory({
        initialEntries: ["/orgs/org-1/competitions/competition-1/rules"],
      }),
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
  title: "Product/Competition/Rules",
  parameters: { layout: "fullscreen" },
  args: { scenario: "editable", locale: "es" },
  argTypes: {
    scenario: {
      control: "select",
      options: [
        "editable",
        "readOnlyPermission",
        "published",
        "league",
        "loading",
        "forbidden",
        "notFound",
        "error",
      ] satisfies Scenario[],
    },
    locale: { control: "inline-radio", options: ["es", "en"] },
  },
  render: (args) => <RulesStory key={`${args.scenario}-${args.locale}`} {...args} />,
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

export const Ready: Story = {
  name: "Borrador editable",
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("button", { name: "Editar reglas" })).toBeVisible();
    await expect(canvas.getByText("Marcador agregado")).toBeVisible();
  },
};

export const ReadyEnglishNarrow: Story = {
  name: "Borrador editable · EN 360",
  args: { locale: "en", narrow: true },
  parameters: { a11y: { test: "error" } },
};

export const NoEditPermission: Story = {
  name: "Sin permiso de edición",
  args: { scenario: "readOnlyPermission" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("Liga + playoffs");
    await expect(canvas.queryByRole("button", { name: "Editar reglas" })).toBeNull();
  },
};

export const PublishedLocked: Story = {
  name: "Publicada (solo lectura)",
  args: { scenario: "published" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/solo lectura/)).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Editar reglas" })).toBeNull();
  },
};

export const LeagueWithoutRescheduling: Story = {
  name: "Liga sin reprogramación",
  args: { scenario: "league" },
};

export const Loading: Story = { name: "Cargando", args: { scenario: "loading" } };
export const Forbidden: Story = { name: "Sin acceso", args: { scenario: "forbidden" } };
export const NotFound: Story = { name: "No encontrada", args: { scenario: "notFound" } };
export const LoadError: Story = {
  name: "Error",
  args: { scenario: "error" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Reintentar" }));
    await expect(await canvas.findByText("Liga + playoffs")).toBeVisible();
  },
};
export const RefreshFailed: Story = {
  name: "Error al actualizar",
  args: { scenario: "stale" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Reintentar" }));
    await expect(canvas.queryByText(/No pudimos actualizar/)).toBeNull();
  },
};
