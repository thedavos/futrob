import type { Meta, StoryObj } from "@storybook/react-vite";

import { Score } from "../score/score.tsx";
import { MetaItem, MetaList, MetaTerm, MetaValue } from "./meta-list.tsx";

const meta = {
  title: "Primitives/MetaList",
  component: MetaList,
  parameters: { layout: "padded" },
  args: {
    columns: 2,
  },
  argTypes: {
    columns: { control: "select", options: [1, 2] },
  },
} satisfies Meta<typeof MetaList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <MetaList {...args}>
      <MetaItem>
        <MetaTerm>Tipo</MetaTerm>
        <MetaValue>Clubs</MetaValue>
      </MetaItem>
      <MetaItem>
        <MetaTerm>Duración</MetaTerm>
        <MetaValue>12 min</MetaValue>
      </MetaItem>
      <MetaItem>
        <MetaTerm>Edición</MetaTerm>
        <MetaValue>FC 26 · PlayStation</MetaValue>
      </MetaItem>
      <MetaItem>
        <MetaTerm>Goles</MetaTerm>
        <MetaValue>
          <Score as="span">2</Score>
        </MetaValue>
      </MetaItem>
    </MetaList>
  ),
};
