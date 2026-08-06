import type { Meta, StoryObj } from "@storybook/react-vite";
import { Info } from "@phosphor-icons/react";

import { Button } from "../components/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/tooltip";

const meta = {
  title: "Primitives/Tooltip",
  component: Tooltip,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger
        render={<Button aria-label="Información de auditoría" size="icon" variant="ghost" />}
      >
        <Info />
      </TooltipTrigger>
      <TooltipContent>La auditoría compara el reporte con los datos de EA.</TooltipContent>
    </Tooltip>
  ),
};
