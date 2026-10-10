import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { FormatPlayEstimate } from "./competition-format-estimate-panel.tsx";

const meta = {
  title: "Product/Organizer/Competition format estimate",
  component: FormatPlayEstimate,
  parameters: { layout: "padded" },
  args: {
    expectedTeams: "8",
    format: "league",
    formatLabel: "Liga",
    legs: "double",
    legsLabel: "Ida y vuelta",
    matchesLabel: "2 partidos",
  },
} satisfies Meta<typeof FormatPlayEstimate>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const League: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { name: "Así se jugará" })).toBeVisible();
    await expect(canvas.getByText("Estimación con 8 equipos.")).toBeVisible();
    await expect(canvas.getByText("Ida y vuelta")).toBeVisible();
    await expect(canvas.getByText("2 partidos")).toBeVisible();
    await expect(canvas.getByText("Jornada")).toBeVisible();
    await expect(canvas.getByText("Enfrentamientos")).toBeVisible();
    await expect(canvas.getByText("14")).toBeVisible();
    await expect(canvas.getByText("56")).toBeVisible();
    await expect(
      canvas.getByText("Esta estimación cambia cuando confirmes los participantes."),
    ).toBeVisible();
  },
};

export const Knockout: Story = {
  args: {
    format: "knockout",
    formatLabel: "Eliminatoria",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Eliminatoria")).toBeVisible();
    await expect(canvas.getByText("3")).toBeVisible();
    await expect(canvas.getByText("7")).toBeVisible();
    const turns = canvas.getByText("Vueltas").closest("div");
    await expect(turns).toHaveTextContent("—");
  },
};

export const MissingTeams: Story = {
  args: { expectedTeams: "1" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Indica los equipos previstos para estimar.")).toBeVisible();
    await expect(canvas.getAllByText("—").length).toBeGreaterThanOrEqual(3);
  },
};
