import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import * as stylex from "@stylexjs/stylex";
import { applyProps } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import type { Locale } from "@/shared/presentation/i18n/catalogs.ts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { playerCompetitionStatsFixture } from "./player-competition-stats.fixtures.ts";
import {
  PlayerCompetitionStatsPageView,
  type PlayerCompetitionStatsView,
} from "./player-competition-stats-page.tsx";

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

const noop = () => undefined;

const SCENARIOS = [
  "ready",
  "partial",
  "unavailableRating",
  "loading",
  "empty",
  "emptyRefreshFailed",
  "error",
  "refreshFailed",
] as const;

type Scenario = (typeof SCENARIOS)[number];

function scenario(id: Scenario): PlayerCompetitionStatsView {
  switch (id) {
    case "ready":
      return { kind: "ready", stats: playerCompetitionStatsFixture(), refreshFailed: null };
    case "partial":
      return {
        kind: "ready",
        stats: playerCompetitionStatsFixture({
          partial: { goals: true, minutes: true },
        }),
        refreshFailed: null,
      };
    case "unavailableRating":
      return {
        kind: "ready",
        stats: playerCompetitionStatsFixture({
          averages: { rating: null },
          partial: { rating: true },
        }),
        refreshFailed: null,
      };
    case "loading":
      return { kind: "loading" };
    case "empty":
      return { kind: "empty", refreshFailed: null };
    case "emptyRefreshFailed":
      return { kind: "empty", refreshFailed: { retry: noop } };
    case "error":
      return { kind: "error", retry: noop };
    case "refreshFailed":
      return {
        kind: "ready",
        stats: playerCompetitionStatsFixture(),
        refreshFailed: { retry: noop },
      };
    default: {
      const exhaustive: never = id;
      return exhaustive;
    }
  }
}

type StoryArgs = {
  readonly scenario: Scenario;
  readonly locale: Locale;
  readonly narrow?: boolean;
};

function Story({ locale, narrow = false, scenario: id }: StoryArgs) {
  return (
    <I18nProvider initialLocale={locale} persistLocale={async () => undefined}>
      <div {...applyProps(undefined, undefined, styles.frame, narrow && styles.narrow)}>
        <PlayerCompetitionStatsPageView view={scenario(id)} />
      </div>
    </I18nProvider>
  );
}

const meta = {
  title: "Product/Player/Competition statistics",
  parameters: { layout: "fullscreen" },
  args: { scenario: "ready", locale: "es" },
  argTypes: {
    scenario: { control: "select", options: SCENARIOS },
    locale: { control: "inline-radio", options: ["es", "en"] },
  },
  render: (args) => (
    <Story key={`${args.scenario}-${args.locale}-${String(args.narrow)}`} {...args} />
  ),
} satisfies Meta<StoryArgs>;

export default meta;
type StoryObject = StoryObj<StoryArgs>;

export const Playground: StoryObject = {};

export const Ready: StoryObject = {
  name: "Con estadísticas",
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { level: 1, name: "Estadísticas" }),
    ).toBeVisible();
    const summary = canvas.getByRole("region", { name: "Resumen" });
    await expect(summary).toHaveTextContent("Partidos");
    await expect(summary).toHaveTextContent("7,5");
    await expect(summary).toHaveTextContent("12");
    await expect(summary).toHaveTextContent("0 por partido");
    await expect(canvas.queryByRole("alert")).toBeNull();
  },
};

export const Partial: StoryObject = {
  name: "Datos parciales",
  args: { scenario: "partial" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText("Algunas métricas no estuvieron disponibles en todos los partidos."),
    ).toBeVisible();
    await expect(canvas.getByRole("region", { name: "Resumen" })).not.toHaveTextContent("540 min");
  },
};

export const UnavailableRating: StoryObject = {
  name: "Rating no disponible",
  args: { scenario: "unavailableRating" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const summary = await canvas.findByRole("region", { name: "Resumen" });
    await expect(summary).toHaveTextContent("Sin datos");
    await expect(summary).not.toHaveTextContent("7,5");
    await expect(summary).toHaveTextContent("12");
  },
};

export const ReadyEnglishNarrow: StoryObject = {
  name: "Con estadísticas · EN 360",
  args: { scenario: "ready", locale: "en", narrow: true },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { level: 1, name: "Statistics" }),
    ).toBeVisible();
    await expect(canvas.getByRole("region", { name: "Summary" })).toHaveTextContent("7.5");
    await expect(canvas.getByText("2 per match")).toBeVisible();
  },
};

export const Loading: StoryObject = {
  name: "Cargando",
  args: { scenario: "loading" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Cargando tus estadísticas…")).toBeVisible();
    await expect(canvas.queryByRole("region", { name: "Resumen" })).toBeNull();
  },
};

export const Empty: StoryObject = {
  name: "Sin resultados aprobados",
  args: { scenario: "empty" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Aún no hay estadísticas oficiales")).toBeVisible();
    await expect(canvas.queryByRole("alert")).toBeNull();
    await expect(canvas.queryByRole("link")).toBeNull();
  },
};

export const EmptyRefreshFailed: StoryObject = {
  name: "Sin resultados aprobados · error al actualizar",
  args: { scenario: "emptyRefreshFailed" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("button", { name: "Reintentar" })).toBeVisible();
    await expect(canvas.getByText("Aún no hay estadísticas oficiales")).toBeVisible();
  },
};

export const LoadError: StoryObject = {
  name: "Error",
  args: { scenario: "error" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const alert = await canvas.findByRole("alert");
    await expect(alert).toHaveTextContent("No pudimos cargar tus estadísticas.");
    await userEvent.click(canvas.getByRole("button", { name: "Reintentar" }));
    await expect(canvas.queryByRole("region", { name: "Resumen" })).toBeNull();
  },
};

export const RefreshFailed: StoryObject = {
  name: "Error al actualizar (datos en caché)",
  args: { scenario: "refreshFailed" },
  parameters: { a11y: { test: "error" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("button", { name: "Reintentar" })).toBeVisible();
    await expect(canvas.getByRole("region", { name: "Resumen" })).toHaveTextContent("12");
  },
};
