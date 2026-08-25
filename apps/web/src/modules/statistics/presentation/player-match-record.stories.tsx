import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import type { PlayerRecentProviderMatchDto } from "@futrob/api-contracts";
import * as stylex from "@stylexjs/stylex";
import { applyProps, TooltipProvider } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { recentProviderMatchFixture } from "./player-matches-page.fixtures.ts";
import { RecentForm } from "./player-match-form.tsx";
import { AverageRatingRing, PerformancePanel } from "./player-match-performance.tsx";
import { RecordLoading, ViewRecord } from "./player-match-record.tsx";
import { summarizeMatchRecord } from "./player-match-view.ts";

const styles = stylex.create({
  frame: {
    maxWidth: "64rem",
    backgroundColor: colors.background,
    padding: "1.5rem",
  },
});

const numberFormat = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });

function listedMatch(
  id: string,
  day: number,
  homeGoals: number,
  awayGoals: number,
  rating: number,
  scored: number,
  assists: number,
): PlayerRecentProviderMatchDto {
  return recentProviderMatchFixture({
    id,
    externalMatchId: id,
    occurredAt: new Date(2026, 7, day, 18, 0).toISOString(),
    home: { externalClubId: "10754", name: "Fera Enjaulada", goals: homeGoals, imageUrl: null },
    away: { externalClubId: "99", name: "Night Owls", goals: awayGoals, imageUrl: null },
    appearance: { rating, goals: scored, assists },
  });
}

const FORM_MATCHES = [
  listedMatch("form-w", 10, 2, 0, 8.4, 1, 1),
  listedMatch("form-d", 12, 1, 1, 7.1, 0, 1),
  listedMatch("form-l", 14, 0, 2, 6.8, 0, 0),
];

const TREND_MATCHES = [
  listedMatch("old-1", 1, 2, 0, 7, 1, 1),
  listedMatch("old-2", 2, 1, 1, 7, 0, 1),
  ...Array.from({ length: 5 }, (_, index) =>
    listedMatch(`recent-${index}`, index + 8, 2, 0, 8.2, 1, 1),
  ),
];

type StoryArgs = {
  readonly rating: number | null;
};

const meta = {
  title: "Product/Player/Match record",
  parameters: { layout: "padded" },
  args: {
    rating: 8.7,
  },
  argTypes: {
    rating: {
      control: { type: "number", min: 0, max: 10, step: 0.1 },
    },
  },
  decorators: [
    (Story) => (
      <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
        <TooltipProvider>
          <div {...applyProps(undefined, undefined, styles.frame)}>
            <Story />
          </div>
        </TooltipProvider>
      </I18nProvider>
    ),
  ],
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

export const Playground: Story = {
  render: (args) => (
    <AverageRatingRing label="Rating promedio" numberFormat={numberFormat} rating={args.rating} />
  ),
};

export const EmptyRating: Story = {
  name: "Rating ring / Empty",
  args: { rating: null },
  render: (args) => (
    <AverageRatingRing label="Rating promedio" numberFormat={numberFormat} rating={args.rating} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("img", { name: "Rating promedio" })).toBeVisible();
    await expect(canvas.getByText("Sin datos")).toBeVisible();
  },
};

export const RecordCards: Story = {
  name: "View record",
  render: () => {
    const matches = FORM_MATCHES;
    return (
      <ViewRecord
        matches={matches}
        numberFormat={numberFormat}
        record={summarizeMatchRecord(matches)}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Rendimiento" })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Record" })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Contribuciones" })).toBeVisible();
    await expect(canvas.getByLabelText("Forma reciente")).toBeVisible();
    await expect(canvas.getByText("G+A")).toBeVisible();
    await expect(canvas.getByText("1 gol · 2 asistencias")).toBeVisible();
    await expect(canvas.getByText("2/3")).toBeVisible();
    await expect(canvas.getByText("Con G+A")).toBeVisible();
    await expect(canvas.getByText("Por partido")).toBeVisible();
    await expect(canvas.getByText("De los goles")).toBeVisible();
    await expect(
      canvas.getByRole("button", {
        name: "Marcaste o asististe en 2 de 3 partidos. No cuenta partidos sin datos de goles o asistencias.",
      }),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Media de 1 G+A por partido." })).toBeVisible();
    await expect(
      canvas.getByRole("button", {
        name: "Marcaste el 33% de los goles del club. No incluye asistencias.",
      }),
    ).toBeVisible();
    await expect(canvasElement.querySelector("[data-rating-trend]")).toBeNull();
  },
};

export const PerformanceWithTrend: Story = {
  name: "Performance / Trend",
  render: () => (
    <PerformancePanel
      matches={TREND_MATCHES}
      numberFormat={numberFormat}
      record={summarizeMatchRecord(TREND_MATCHES)}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Rating promedio")).toBeVisible();
    await expect(canvas.getByText("Partidos")).toBeVisible();
    await expect(canvasElement.querySelector("[data-rating-trend='up']")).toBeTruthy();
    await expect(canvas.getByText(/vs últimos 5/)).toBeVisible();
  },
};

export const RecentFormMarks: Story = {
  name: "Recent form",
  render: () => <RecentForm matches={FORM_MATCHES} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText("Forma reciente")).toBeVisible();
    await expect(
      canvas.getAllByRole("button", { name: "Victoria 2 – 0 contra Night Owls" }),
    ).toHaveLength(2);
    await expect(
      canvas.getAllByRole("button", { name: "Empate 1 – 1 contra Night Owls" }),
    ).toHaveLength(2);
    await expect(
      canvas.getAllByRole("button", { name: "Derrota 0 – 2 contra Night Owls" }),
    ).toHaveLength(2);
    await expect(canvasElement.querySelector("[data-last-game-outcome='win']")?.textContent).toBe(
      "V",
    );
    await expect(canvasElement.querySelector("[data-last-game-outcome='draw']")?.textContent).toBe(
      "E",
    );
    await expect(canvasElement.querySelector("[data-last-game-outcome='loss']")?.textContent).toBe(
      "D",
    );
  },
};

export const Loading: Story = {
  name: "Loading",
  render: () => <RecordLoading />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText("Cargando el resumen de partidos…")).toBeVisible();
  },
};
