import type { Meta, StoryObj } from "@storybook/react-vite";

import { Score } from "./score.tsx";

const meta = {
  title: "Primitives/Score",
  component: Score,
  parameters: { layout: "padded" },
  args: {
    children: "2–1",
    align: "start",
    tone: "default",
    truncate: false,
  },
  argTypes: {
    align: { control: "select", options: ["start", "center", "end"] },
    tone: { control: "select", options: ["default", "muted"] },
    as: { control: "select", options: ["p", "span"] },
  },
} satisfies Meta<typeof Score>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Centered: Story = {
  args: { align: "center" },
};

export const TabularValues: Story = {
  render: () => (
    <>
      <Score>2–1</Score>
      <Score>47%</Score>
      <Score>28</Score>
      <Score tone="muted">—</Score>
    </>
  ),
};
