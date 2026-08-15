import type { Meta, StoryObj } from "@storybook/react-vite";
import { CheckCircleIcon, LightningIcon, StarIcon, WarningIcon } from "@phosphor-icons/react";

import { Badge } from "../components/badge";

const meta = {
  title: "Primitives/Badge",
  component: Badge,
  parameters: { layout: "centered" },
  args: {
    children: "Pendiente",
    variant: "neutral",
  },
  argTypes: {
    variant: {
      control: "select",
      options: [
        "neutral",
        "primary",
        "approved",
        "info",
        "warning",
        "destructive",
        "emphasis",
        "outline",
      ],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const ClosedVariants: Story = {
  render: () => (
    <div className="flex max-w-2xl flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-6">
      <Badge variant="neutral">Pendiente</Badge>
      <Badge variant="primary">Acción</Badge>
      <Badge variant="approved">
        <CheckCircleIcon />
        Aprobado
      </Badge>
      <Badge variant="info">
        <LightningIcon />
        Sincronizado
      </Badge>
      <Badge variant="warning">
        <WarningIcon />
        Auditar
      </Badge>
      <Badge variant="destructive">Disputa</Badge>
      <Badge variant="emphasis">Destacado</Badge>
      <Badge variant="outline">Borrador</Badge>
      <Badge>
        <StarIcon weight="fill" />
        Neutral por defecto
      </Badge>
    </div>
  ),
};
