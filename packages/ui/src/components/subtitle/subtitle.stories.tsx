import type { Meta, StoryObj } from "@storybook/react-vite";

import { Subtitle } from "./subtitle.tsx";

const meta = {
  title: "Primitives/Subtitle",
  component: Subtitle,
  parameters: { layout: "padded" },
  args: {
    children: "Resultados auditados de la jornada en curso.",
    tone: "muted",
    truncate: false,
  },
  argTypes: {
    tone: { control: "select", options: ["default", "muted"] },
    as: { control: "select", options: ["p", "span"] },
  },
} satisfies Meta<typeof Subtitle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
