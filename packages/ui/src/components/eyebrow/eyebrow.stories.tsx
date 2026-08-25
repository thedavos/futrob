import type { Meta, StoryObj } from "@storybook/react-vite";

import { Eyebrow } from "./eyebrow.tsx";

const meta = {
  title: "Primitives/Eyebrow",
  component: Eyebrow,
  parameters: { layout: "padded" },
  args: {
    children: "Espacio personal",
    truncate: false,
  },
  argTypes: {
    as: { control: "select", options: ["p", "span"] },
  },
} satisfies Meta<typeof Eyebrow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
