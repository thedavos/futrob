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
import { expect, userEvent, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import { applyProps } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { groupsKnockoutFixture, noFixture } from "./competition-fixture.fixtures.ts";
import { CompetitionFixturePageView } from "./competition-fixture-page.tsx";
import {
  competitionFixturePageState,
  type CompetitionFixturePageState,
} from "./competition-fixture-state.ts";

const styles = stylex.create({
  frame: {
    minHeight: "100svh",
    backgroundColor: colors.background,
    paddingInline: { default: "1rem", [media.lg]: "2.5rem" },
    paddingBlock: "1.5rem",
  },
  narrow: {
    width: 360,
    paddingInline: "1rem",
  },
});

const retry = () => undefined;

const ready = competitionFixturePageState({
  data: groupsKnockoutFixture,
  failed: false,
  refused: false,
  retry,
});

type Scenario = "ready" | "stale" | "empty" | "loading" | "notFound" | "error";

const STATES: Record<Scenario, CompetitionFixturePageState> = {
  ready,
  stale: competitionFixturePageState({
    data: groupsKnockoutFixture,
    failed: true,
    refused: false,
    retry,
  }),
  empty: competitionFixturePageState({ data: noFixture, failed: false, refused: false, retry }),
  loading: { kind: "loading" },
  notFound: { kind: "not_found" },
  error: { kind: "error", retry },
};

type StoryArgs = {
  readonly scenario: Scenario;
  readonly locale: Locale;
  readonly narrow?: boolean;
};

function FixtureStory({ locale, narrow = false, scenario }: StoryArgs) {
  const router = useMemo(() => {
    const rootRoute = createRootRoute({ component: Outlet });
    const fixtureRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId/fixture",
      component: () => (
        <CompetitionFixturePageView
          competitionId="competition-1"
          organizationId="org-1"
          state={STATES[scenario]}
        />
      ),
    });
    const encounterRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId/encounters/$encounterId",
      component: () => <p>Enfrentamiento</p>,
    });
    return createRouter({
      routeTree: rootRoute.addChildren([fixtureRoute, encounterRoute]),
      history: createMemoryHistory({
        initialEntries: ["/orgs/org-1/competitions/competition-1/fixture"],
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
  title: "Product/Competition/Fixture",
  parameters: { layout: "fullscreen" },
  args: { scenario: "ready", locale: "es" },
  argTypes: {
    scenario: {
      control: "select",
      options: ["ready", "stale", "empty", "loading", "notFound", "error"] satisfies Scenario[],
    },
    locale: { control: "inline-radio", options: ["es", "en"] },
  },
  render: (args) => <FixtureStory key={`${args.scenario}-${args.locale}`} {...args} />,
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

export const Ready: Story = {
  name: "Con calendario",
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Grupos" })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Jornada 1" })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Semifinales" })).toBeVisible();
    await expect(canvas.getByText("Horarios en America/Lima")).toBeVisible();
    await expect(canvas.getByText("Ganador de la semifinal 1")).toBeVisible();
    const row = await canvas.findByRole("link", { name: "Abrir Cuervos FC vs Maderas FC" });
    await userEvent.click(row);
    await expect(await canvas.findByText("Enfrentamiento")).toBeVisible();
  },
};

export const ReadyEnglishNarrow: Story = {
  name: "Con calendario · EN 360",
  args: { locale: "en", narrow: true },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Groups" })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Matchday 1" })).toBeVisible();
    await expect(canvas.getByText("1st in group A")).toBeVisible();
  },
};

export const Stale: Story = {
  name: "Última lectura",
  args: { scenario: "stale" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("link", { name: "Abrir Cuervos FC vs Maderas FC" }),
    ).toBeVisible();
    await expect(
      canvas.getByText("No pudimos actualizar el calendario. Ves la última lectura correcta."),
    ).toBeVisible();
  },
};

export const Empty: Story = {
  name: "Sin calendario",
  args: { scenario: "empty" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Aún no hay calendario" })).toBeVisible();
    await expect(canvas.queryByRole("link")).toBeNull();
  },
};

export const Loading: Story = { name: "Cargando", args: { scenario: "loading" } };

export const NotFound: Story = { name: "No disponible", args: { scenario: "notFound" } };

export const LoadError: Story = { name: "Error", args: { scenario: "error" } };
