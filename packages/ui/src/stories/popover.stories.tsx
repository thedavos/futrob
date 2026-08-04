import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "../components/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "../components/popover";

const meta = {
  title: "Primitives/Popover",
  component: Popover,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" />}>Ver criterio</PopoverTrigger>
      <PopoverContent>
        <PopoverTitle>Resultado aprobado</PopoverTitle>
        <PopoverDescription>
          El marcador fue auditado por el staff y ya alimenta estadísticas oficiales.
        </PopoverDescription>
      </PopoverContent>
    </Popover>
  ),
};
