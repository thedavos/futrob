import type { Meta, StoryObj } from "@storybook/react-vite";

import { Body } from "./body.tsx";

const meta = {
  title: "Primitives/Body",
  component: Body,
  parameters: { layout: "padded" },
  args: {
    children:
      "Sincroniza los partidos del proveedor y elige cuáles cuentan como oficiales. La tabla pública solo cambia cuando apruebas el resultado.",
    size: "md",
    tone: "default",
    measure: false,
    truncate: false,
  },
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"] },
    tone: { control: "select", options: ["default", "muted"] },
    weight: { control: "select", options: ["regular", "medium", "semibold", "bold"] },
    align: { control: "select", options: ["start", "center", "end"] },
    as: { control: "select", options: ["p", "span"] },
  },
} satisfies Meta<typeof Body>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Sizes: Story = {
  render: () => (
    <>
      <Body size="sm">sm · 12px · chrome denso y notas cortas.</Body>
      <Body size="md">md · 14px · cuerpo de producto por defecto.</Body>
      <Body size="lg">lg · 16px · lectura más holgada en marketing o vacíos.</Body>
    </>
  ),
};

export const ReadingMeasure: Story = {
  args: {
    size: "lg",
    measure: true,
  },
};
