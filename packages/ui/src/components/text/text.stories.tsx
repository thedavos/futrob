import type { Meta, StoryObj } from "@storybook/react-vite";

import { Text } from "./text.tsx";

const meta = {
  title: "Primitives/Text",
  component: Text,
  parameters: { layout: "padded" },
  args: {
    children: "Atlas FC",
    look: "body",
    tone: "default",
    truncate: false,
  },
  argTypes: {
    look: {
      control: "select",
      options: ["body", "caption", "label", "subtitle"],
    },
    tone: { control: "select", options: ["default", "muted"] },
    weight: { control: "select", options: ["regular", "medium", "semibold", "bold"] },
    align: { control: "select", options: ["start", "center", "end"] },
    as: { control: "select", options: ["span", "p", "strong", "em", "div"] },
  },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Looks: Story = {
  render: () => (
    <div>
      <p>
        <Text look="label" tone="muted">
          Tipo
        </Text>{" "}
        <Text look="body">Clubs</Text>
      </p>
      <p>
        <Text look="caption" tone="muted">
          Sincronizado hace 12 minutos
        </Text>
      </p>
      <p>
        <Text as="strong" look="subtitle" weight="medium">
          Grupo A · ida
        </Text>
      </p>
    </div>
  ),
};
