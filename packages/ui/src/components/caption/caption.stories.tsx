import type { Meta, StoryObj } from "@storybook/react-vite";

import { Caption } from "./caption.tsx";

const meta = {
  title: "Primitives/Caption",
  component: Caption,
  parameters: { layout: "padded" },
  args: {
    children: "Actualizado hace 2 horas.",
    tone: "muted",
    truncate: false,
  },
  argTypes: {
    tone: { control: "select", options: ["default", "muted"] },
    as: { control: "select", options: ["p", "span"] },
  },
} satisfies Meta<typeof Caption>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
