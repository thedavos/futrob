import type { Meta, StoryObj } from "@storybook/react-vite";
import * as stylex from "@stylexjs/stylex";

import { applyProps } from "#styles/apply";

import { Input } from "../input.tsx";
import { Label } from "./label.tsx";

const styles = stylex.create({
  field: {
    display: "grid",
    maxWidth: "20rem",
    gap: "0.5rem",
  },
});

const meta = {
  title: "Primitives/Label",
  component: Label,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: () => (
    <div {...applyProps(undefined, undefined, styles.field)}>
      <Label htmlFor="competition-name">Nombre de la competición</Label>
      <Input id="competition-name" name="name" />
    </div>
  ),
};
