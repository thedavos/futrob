import type { Meta, StoryObj } from "@storybook/react-vite";

import { SectionTitle } from "./section-title.tsx";

const meta = {
  title: "Primitives/SectionTitle",
  component: SectionTitle,
  parameters: { layout: "padded" },
  args: {
    children: "Rendimiento",
    as: "h2",
    tone: "default",
    truncate: false,
  },
  argTypes: {
    as: { control: "select", options: ["h2", "h3", "h4"] },
    tone: { control: "select", options: ["default", "muted"] },
  },
} satisfies Meta<typeof SectionTitle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
