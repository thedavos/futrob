import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/select";

const meta = {
  title: "Primitives/Select",
  component: Select,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: () => (
    <Select defaultValue="ps5">
      <SelectTrigger aria-label="Plataforma" className="w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ps5">PlayStation</SelectItem>
        <SelectItem value="xbox">Xbox</SelectItem>
        <SelectItem value="pc">PC</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const Dense: Story = {
  render: () => (
    <Select defaultValue="a">
      <SelectTrigger aria-label="Cancha" className="w-40" dense>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="a">Cancha A</SelectItem>
        <SelectItem value="b">Cancha B</SelectItem>
      </SelectContent>
    </Select>
  ),
};
