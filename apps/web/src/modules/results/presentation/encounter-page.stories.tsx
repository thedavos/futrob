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
import { encounterView, m1, m2, m3, m4, readyCandidates } from "./encounter-page.fixtures.ts";
import { EncounterPageView, type CandidatesState, type EncounterState } from "./encounter-page.tsx";

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

type Scenario =
  | "aggregate"
  | "independent"
  | "singleMatch"
  | "modeUnknown"
  | "noCandidates"
  | "awayNotConnected"
  | "providerMismatch"
  | "candidatesRestricted"
  | "candidatesError"
  | "refreshFailed"
  | "loading"
  | "notFound"
  | "forbidden"
  | "error";

type StoryArgs = {
  readonly scenario: Scenario;
  readonly locale: Locale;
  readonly narrow?: boolean;
};

const noop = () => undefined;
const updatedAt = Date.parse("2026-09-17T03:00:00.000Z");

const candidatesReady = (
  data: Extract<CandidatesState, { kind: "ready" }>["data"],
  refreshFailed = false,
): CandidatesState => ({
  kind: "ready",
  data,
  updatedAt,
  refreshing: false,
  refreshFailed,
  refresh: noop,
});

function stateFor(scenario: Scenario): {
  readonly encounter: EncounterState;
  readonly candidates: CandidatesState;
} {
  const ready = (view = encounterView()): EncounterState => ({ kind: "ready", view });
  const list = candidatesReady(readyCandidates([m1, m3, m2, m4]));
  switch (scenario) {
    case "aggregate":
      return { encounter: ready(), candidates: list };
    case "independent":
      return {
        encounter: ready(encounterView({ resolutionMode: "independent_matches" })),
        candidates: list,
      };
    case "singleMatch":
      return {
        encounter: ready(
          encounterView({
            officialMatchCount: 1,
            resolutionMode: "independent_matches",
            officialMatches: [{ officialSlot: 1, scheduledStartAt: "2026-09-15T01:00:00.000Z" }],
          }),
        ),
        candidates: candidatesReady(readyCandidates([m1, m3])),
      };
    case "modeUnknown":
      return {
        encounter: ready(encounterView({ resolutionMode: null, round: null })),
        candidates: list,
      };
    case "noCandidates":
      return { encounter: ready(), candidates: candidatesReady(readyCandidates([])) };
    case "awayNotConnected":
      return {
        encounter: ready(),
        candidates: candidatesReady({ status: "clubs_not_connected", sides: ["away"] }),
      };
    case "providerMismatch":
      return { encounter: ready(), candidates: candidatesReady({ status: "provider_mismatch" }) };
    case "candidatesRestricted":
      return { encounter: ready(), candidates: { kind: "forbidden" } };
    case "candidatesError":
      return { encounter: ready(), candidates: { kind: "error", retry: noop } };
    case "refreshFailed":
      return { encounter: ready(), candidates: candidatesReady(readyCandidates([m1, m2]), true) };
    case "loading":
      return { encounter: { kind: "loading" }, candidates: { kind: "loading" } };
    case "notFound":
      return { encounter: { kind: "not_found" }, candidates: { kind: "loading" } };
    case "forbidden":
      return { encounter: { kind: "forbidden" }, candidates: { kind: "loading" } };
    case "error":
      return { encounter: { kind: "error", retry: noop }, candidates: { kind: "loading" } };
    default: {
      const exhaustive: never = scenario;
      return exhaustive;
    }
  }
}

function EncounterStory({ locale, narrow = false, scenario }: StoryArgs) {
  const router = useMemo(() => {
    const rootRoute = createRootRoute({ component: Outlet });
    const encounterRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId/encounters/$encounterId",
      component: () => (
        <EncounterPageView
          competitionId="competition-1"
          organizationId="org-1"
          {...stateFor(scenario)}
        />
      ),
    });
    const listRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId/encounters",
      component: () => <p>Enfrentamientos</p>,
    });
    return createRouter({
      routeTree: rootRoute.addChildren([encounterRoute, listRoute]),
      history: createMemoryHistory({
        initialEntries: ["/orgs/org-1/competitions/competition-1/encounters/encounter-1"],
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

const scenarios: readonly Scenario[] = [
  "aggregate",
  "independent",
  "singleMatch",
  "modeUnknown",
  "noCandidates",
  "awayNotConnected",
  "providerMismatch",
  "candidatesRestricted",
  "candidatesError",
  "refreshFailed",
  "loading",
  "notFound",
  "forbidden",
  "error",
];

const meta = {
  title: "Product/Competition/Encounter",
  parameters: { layout: "fullscreen" },
  args: { scenario: "aggregate", locale: "es" },
  argTypes: {
    scenario: { control: "select", options: scenarios },
    locale: { control: "inline-radio", options: ["es", "en"] },
  },
  render: (args) => <EncounterStory key={`${args.scenario}-${args.locale}`} {...args} />,
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

export const Playground: Story = {};

export const AggregatePreview: Story = {
  name: "Vista previa agregada",
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { level: 1, name: "Cuervos FC vs Maderas FC" }),
    ).toBeInTheDocument();
    const rows = within(canvas.getByRole("list", { name: "Partidos EA candidatos" }));
    await userEvent.click(
      within(rows.getAllByRole("listitem")[0]!).getByRole("button", { name: "Usar en partido 1" }),
    );
    await userEvent.click(
      within(rows.getAllByRole("listitem")[2]!).getByRole("button", { name: "Usar en partido 2" }),
    );
    const aggregate = within(canvas.getByRole("group", { name: "Global" }));
    await expect(aggregate.getByText("1–2")).toBeVisible();
    await expect(aggregate.getByText("Gana Maderas FC")).toBeVisible();
  },
};

export const IndependentMatches: Story = { args: { scenario: "independent" } };

export const SingleMatch: Story = { args: { scenario: "singleMatch" } };

export const ResolutionUnknown: Story = { args: { scenario: "modeUnknown" } };

export const NoCandidates: Story = { args: { scenario: "noCandidates" } };

export const AwayClubNotConnected: Story = {
  args: { scenario: "awayNotConnected" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText("Maderas FC no tiene un club EA conectado."),
    ).toBeVisible();
  },
};

export const ProviderMismatch: Story = { args: { scenario: "providerMismatch" } };

export const CandidatesRestricted: Story = { args: { scenario: "candidatesRestricted" } };

export const CandidatesError: Story = { args: { scenario: "candidatesError" } };

export const RefreshFailedWithCachedCandidates: Story = { args: { scenario: "refreshFailed" } };

export const Loading: Story = { args: { scenario: "loading" } };

export const NotFound: Story = { args: { scenario: "notFound" } };

export const Forbidden: Story = { args: { scenario: "forbidden" } };

export const ErrorState: Story = { args: { scenario: "error" } };

export const English: Story = { args: { scenario: "aggregate", locale: "en" } };

export const Narrow360: Story = {
  name: "360 px",
  args: { scenario: "aggregate", narrow: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("heading", { level: 1, name: "Cuervos FC vs Maderas FC" });
    const frame = canvasElement.firstElementChild as HTMLElement;
    await expect(frame.scrollWidth).toBeLessThanOrEqual(frame.clientWidth);
  },
};
