import type { Meta, StoryObj } from "@storybook/react-vite";
import * as stylex from "@stylexjs/stylex";

import { applyProps } from "#styles/apply";

import { Heading } from "./heading.tsx";

const styles = stylex.create({
  narrow: {
    maxWidth: "12rem",
  },
});

const meta = {
  title: "Primitives/Heading",
  component: Heading,
  parameters: { layout: "padded" },
  args: {
    children: "Clasificación oficial",
    as: "h2",
    truncate: false,
  },
  argTypes: {
    as: {
      control: "select",
      options: ["h2", "h3", "h4", "h5", "h6"],
    },
  },
} satisfies Meta<typeof Heading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Levels: Story = {
  render: () => (
    <>
      <Heading as="h2">Jornada 4</Heading>
      <Heading as="h3">Grupo A</Heading>
      <Heading as="h4">Nova FC vs Atlas</Heading>
    </>
  ),
};

export const Truncated: Story = {
  args: {
    truncate: true,
    children: "Un título de encuentro demasiado largo para la fila",
  },
  decorators: [
    (Story) => (
      <div {...applyProps(undefined, undefined, styles.narrow)}>
        <Story />
      </div>
    ),
  ],
};
