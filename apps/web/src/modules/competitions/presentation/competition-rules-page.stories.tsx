import { useMemo, useState, useSyncExternalStore } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CompetitionDraftDto } from "@futrob/api-contracts";
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

const phone360Viewport = {
  options: { phone360: { name: "Phone 360", styles: { width: "360px", height: "800px" } } },
} as const;

const mixedRescheduleDraft: CompetitionDraftDto = {
  ...leaguePlayoffsDraft,
  rules: {
    ...leaguePlayoffsDraft.rules,
    knockoutStage: leaguePlayoffsDraft.rules.knockoutStage
      ? { ...leaguePlayoffsDraft.rules.knockoutStage, allowRescheduling: false }
      : null,
  },
};

function createLoadingGate() {
  let resolved = false;
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const listener of listeners) listener();
  };
  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => resolved,
    resolve: () => {
      resolved = true;
      notify();
    },
    reset: () => {
      resolved = false;
      notify();
    },
  };
}

const narrowTransitionGate = createLoadingGate();

type Scenario =
  | "editable"
  | "readOnlyPermission"
  | "published"
  | "league"
  | "loading"
  | "loadingToMixedReady"
  | "forbidden"
  | "notFound"
  | "error"
  | "stale";

const STATES: Record<Exclude<Scenario, "loadingToMixedReady">, CompetitionRulesState> = {
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
  const transitionResolved = useSyncExternalStore(
    narrowTransitionGate.subscribe,
    narrowTransitionGate.getSnapshot,
    narrowTransitionGate.getSnapshot,
  );
  // The static retry callbacks recover like a real refetch: the next fetch succeeds.
  let state: CompetitionRulesState;
  if (scenario === "loadingToMixedReady") {
    state = transitionResolved
      ? { kind: "ready", draft: mixedRescheduleDraft, canEdit: false }
      : { kind: "loading" };
  } else {
    const base = STATES[scenario];
    state = base;
    if (recovered) state = { kind: "ready", draft: leaguePlayoffsDraft, canEdit: true };
    else if (base.kind === "error") state = { ...base, retry: () => setRecovered(true) };
    else if (base.kind === "ready" && base.refreshFailed) {
      state = { ...base, refreshFailed: () => setRecovered(true) };
    }
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

export const Loading: Story = {
  name: "Cargando",
  args: { scenario: "loading" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const status = canvas.getByRole("status");
    await expect(status).toHaveTextContent("Cargando el reglamento…");
    await expect(status.closest("[aria-busy='true']")).toBeNull();
    await expect(canvasElement.querySelector("[aria-busy='true']")).toBeTruthy();
    await expect(canvas.getByRole("heading", { name: "Formato" })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Reglas de la plataforma" })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Plantilla" })).toBeVisible();
    await expect(canvas.getAllByRole("heading", { name: "Puntuación" })).toHaveLength(2);
    await expect(canvas.queryByText("Aviso mínimo")).toBeNull();
    await expect(canvas.queryByText("Liga + playoffs")).toBeNull();
    await expect(canvas.queryByRole("button", { name: "Editar reglas" })).toBeNull();
    await expect(canvasElement.querySelectorAll("[data-slot='skeleton']").length).toBeGreaterThan(
      0,
    );
  },
};

export const LoadingNarrow: Story = {
  name: "Cargando · 360",
  args: { scenario: "loading" },
  // A real 360 px viewport so StyleX breakpoints stack the two columns and MetaList items.
  globals: { viewport: { value: "phone360", isRotated: false } },
  parameters: { viewport: phone360Viewport },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(window.innerWidth).toBe(360);
    const status = canvas.getByRole("status");
    await expect(status).toHaveTextContent("Cargando el reglamento…");
    await expect(status.closest("[aria-busy='true']")).toBeNull();
    const formatHeading = canvas.getByRole("heading", { name: "Formato" });
    const platformHeading = canvas.getByRole("heading", { name: "Reglas de la plataforma" });
    await expect(formatHeading).toBeVisible();
    await expect(platformHeading).toBeVisible();
    await expect(platformHeading.getBoundingClientRect().top).toBeGreaterThan(
      formatHeading.getBoundingClientRect().bottom,
    );
  },
};

export const LoadingTransitionNarrow: Story = {
  name: "Cargando → listo · 360",
  args: { scenario: "loadingToMixedReady" },
  // Verify the loading -> ready transition on a real 360 px viewport with a 2-stage draft
  // where one stage disallows rescheduling, isolating rescheduling height from stage count.
  globals: { viewport: { value: "phone360", isRotated: false } },
  parameters: { viewport: phone360Viewport },
  beforeEach: () => {
    narrowTransitionGate.reset();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(window.innerWidth).toBe(360);
    const status = canvas.getByRole("status");
    await expect(status).toHaveTextContent("Cargando el reglamento…");
    await expect(status.closest("[aria-busy='true']")).toBeNull();
    await expect(canvasElement.querySelector("[aria-busy='true']")).toBeTruthy();

    const loadingFormatHeading = canvas.getByRole("heading", { name: "Formato" });
    const loadingPlatformHeading = canvas.getByRole("heading", { name: "Reglas de la plataforma" });
    const loadingPlatformTop = loadingPlatformHeading.getBoundingClientRect().top;
    await expect(loadingPlatformTop).toBeGreaterThan(
      loadingFormatHeading.getBoundingClientRect().bottom,
    );

    narrowTransitionGate.resolve();

    await expect(await canvas.findByText("Liga + playoffs")).toBeVisible();
    await expect(canvas.getByText("No se permiten reprogramaciones")).toBeVisible();
    await expect(canvas.getByRole("status")).toBe(status);
    await expect(status).toHaveTextContent("");
    await expect(canvasElement.querySelector("[aria-busy='true']")).toBeNull();

    const readyPlatformTop = canvas
      .getByRole("heading", { name: "Reglas de la plataforma" })
      .getBoundingClientRect().top;
    await expect(Math.abs(readyPlatformTop - loadingPlatformTop)).toBeLessThan(160);
  },
};
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
