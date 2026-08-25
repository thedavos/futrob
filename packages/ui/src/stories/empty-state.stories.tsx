import type { Meta, StoryObj } from "@storybook/react-vite";
import { TrayIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { applyHost, applyStyles } from "@futrob/ui";
import { media } from "#styles/media.stylex";

import { Button } from "../components/button";
import {
  EmptyState,
  EmptyStateActions,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
} from "../components/empty-state";

const styles = stylex.create({
  playground: {
    marginInline: "auto",
    maxWidth: "32rem",
  },
  compare: {
    marginInline: "auto",
    display: "grid",
    width: "100%",
    maxWidth: "56rem",
    gap: "2rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(2, minmax(0, 1fr))",
    },
  },
});

const playground = applyStyles(styles.playground);

const meta = {
  title: "Primitives/EmptyState",
  component: EmptyState,
  parameters: { layout: "padded" },
  args: {
    className: playground.className,
    style: playground.style,
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
        <TrayIcon />
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
        <TrayIcon />
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
        <TrayIcon />
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
    <div {...applyHost(undefined, undefined, styles.compare)}>
      <EmptyState variant="flat">
        <EmptyStateIcon>
          <TrayIcon />
        </EmptyStateIcon>
        <EmptyStateTitle>flat</EmptyStateTitle>
        <EmptyStateDescription>Borde dashed · paneles embebidos.</EmptyStateDescription>
      </EmptyState>
      <EmptyState variant="elevated">
        <EmptyStateIcon>
          <TrayIcon />
        </EmptyStateIcon>
        <EmptyStateTitle>elevated</EmptyStateTitle>
        <EmptyStateDescription>elevation.md · panel aislado.</EmptyStateDescription>
      </EmptyState>
    </div>
  ),
};
