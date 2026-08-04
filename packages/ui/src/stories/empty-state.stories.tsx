import type { Meta, StoryObj } from "@storybook/react-vite";
import { Inbox } from "lucide-react";

import { Button } from "../components/button";
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
} from "../components/empty-state";

const meta = {
  title: "Primitives/EmptyState",
  component: EmptyState,
  parameters: { layout: "padded" },
  args: {
    className: "mx-auto max-w-lg",
    variant: "flat",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["flat", "elevated"],
    },
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <EmptyState {...args}>
      <EmptyStateIcon>
        <Inbox />
      </EmptyStateIcon>
      <EmptyStateTitle>Sin partidos sincronizados</EmptyStateTitle>
      <EmptyStateDescription>
        Cuando sincronices el club de EA, los candidatos aparecerán aquí para revisión.
      </EmptyStateDescription>
      <EmptyStateActions>
        <Button>Sincronizar ahora</Button>
        <Button variant="outline">Ver guía</Button>
      </EmptyStateActions>
    </EmptyState>
  ),
};

export const Flat: Story = {
  args: { variant: "flat" },
  render: (args) => (
    <EmptyState {...args}>
      <EmptyStateIcon>
        <Inbox />
      </EmptyStateIcon>
      <EmptyStateTitle>Sin resultados</EmptyStateTitle>
      <EmptyStateDescription>Ajusta los filtros o limpia la búsqueda.</EmptyStateDescription>
    </EmptyState>
  ),
};

export const Elevated: Story = {
  args: { variant: "elevated" },
  render: (args) => (
    <EmptyState {...args}>
      <EmptyStateIcon>
        <Inbox />
      </EmptyStateIcon>
      <EmptyStateTitle>Aún no hay encuentros</EmptyStateTitle>
      <EmptyStateDescription>
        Crea la primera jornada para empezar a programar partidos.
      </EmptyStateDescription>
      <EmptyStateActions>
        <Button>Crear jornada</Button>
      </EmptyStateActions>
    </EmptyState>
  ),
};

export const Compare: Story = {
  render: () => (
    <div className="mx-auto grid w-full max-w-4xl gap-8 sm:grid-cols-2">
      <EmptyState variant="flat">
        <EmptyStateIcon>
          <Inbox />
        </EmptyStateIcon>
        <EmptyStateTitle>flat</EmptyStateTitle>
        <EmptyStateDescription>Borde dashed · paneles embebidos.</EmptyStateDescription>
      </EmptyState>
      <EmptyState variant="elevated">
        <EmptyStateIcon>
          <Inbox />
        </EmptyStateIcon>
        <EmptyStateTitle>elevated</EmptyStateTitle>
        <EmptyStateDescription>smooth-shadow-ring-md · panel aislado.</EmptyStateDescription>
      </EmptyState>
    </div>
  ),
};
