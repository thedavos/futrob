import type { Meta, StoryObj } from "@storybook/react-vite";

import { Score } from "./score.tsx";

const meta = {
  title: "Components/Data display/Score",
  tags: ["autodocs"],
  component: Score,
  parameters: { layout: "padded" },
  args: {
    children: "2–1",
    align: "start",
    size: "default",
    tone: "default",
    truncate: false,
  },
  argTypes: {
    align: { control: "select", options: ["start", "center", "end"] },
    size: { control: "inline-radio", options: ["default", "table"] },
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

export const TableScale: Story = {
  render: () => (
    <>
      <Score size="table" align="end">
        28
      </Score>
      <Score size="table" align="end">
        +12
      </Score>
      <Score size="table" align="end" tone="muted">
        —
      </Score>
    </>
  ),
};
