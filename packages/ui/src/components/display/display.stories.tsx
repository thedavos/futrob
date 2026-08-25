import type { Meta, StoryObj } from "@storybook/react-vite";

import { Display } from "./display.tsx";

const meta = {
  title: "Primitives/Display",
  component: Display,
  parameters: { layout: "padded" },
  args: {
    children: "Competiciones claras para FC Clubs",
    as: "h1",
    truncate: false,
  },
  argTypes: {
    as: { control: "select", options: ["h1", "h2", "h3"] },
  },
} satisfies Meta<typeof Display>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
