import type { Meta, StoryObj } from "@storybook/react-vite";
import { WarningCircleIcon, CheckCircleIcon, InfoIcon, WarningIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { applyHost, applyStyles } from "@futrob/ui";
import { media } from "#styles/media.stylex";

import { Alert, AlertDescription, AlertTitle } from "../components/alert";

const styles = stylex.create({
  playground: {
    width: "min(28rem, calc(100vw - 2rem))",
  },
  variants: {
    display: "grid",
    width: "min(28rem, calc(100vw - 2rem))",
    gap: "1rem",
  },
  elevation: {
    display: "grid",
    width: "min(40rem, calc(100vw - 2rem))",
    gap: "1.5rem",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(2, minmax(0, 1fr))",
    },
  },
});

const playground = applyStyles(styles.playground);

const meta = {
  title: "Primitives/Alert",
  component: Alert,
  parameters: { layout: "centered" },
  args: {
    className: playground.className,
    style: playground.style,
    elevation: "flat",
    variant: "default",
  },
  argTypes: {
    elevation: {
      control: "select",
      options: ["flat", "elevated"],
    },
    variant: {
      control: "select",
      options: ["default", "info", "success", "warning", "destructive"],
    },
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <Alert {...args}>
      <InfoIcon />
      <AlertTitle>Sincronización pendiente</AlertTitle>
      <AlertDescription>
        Los partidos de EA todavía no se han sincronizado para esta jornada.
      </AlertDescription>
    </Alert>
  ),
};

export const ClosedVariants: Story = {
  render: () => (
    <div {...applyHost(undefined, undefined, styles.variants)}>
      <Alert variant="default">
        <InfoIcon />
        <AlertTitle>Aviso</AlertTitle>
        <AlertDescription>Revisa la configuración antes de publicar.</AlertDescription>
      </Alert>
      <Alert variant="info">
        <InfoIcon />
        <AlertTitle>Sincronización</AlertTitle>
        <AlertDescription>La cola de sync está activa.</AlertDescription>
      </Alert>
      <Alert variant="success">
        <CheckCircleIcon />
        <AlertTitle>Resultado aprobado</AlertTitle>
        <AlertDescription>El marcador ya alimenta estadísticas oficiales.</AlertDescription>
      </Alert>
      <Alert variant="warning">
        <WarningIcon />
        <AlertTitle>Datos incompletos</AlertTitle>
        <AlertDescription>Dos jugadores todavía no vincularon su cuenta.</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <WarningCircleIcon />
        <AlertTitle>Disputa abierta</AlertTitle>
        <AlertDescription>
          El staff debe resolver el conflicto antes de oficializar.
        </AlertDescription>
      </Alert>
    </div>
  ),
};

export const Elevation: Story = {
  render: () => (
    <div {...applyHost(undefined, undefined, styles.elevation)}>
      <Alert elevation="flat" variant="warning">
        <WarningIcon />
        <AlertTitle>flat</AlertTitle>
        <AlertDescription>Borde semántico · alerts inline en forms.</AlertDescription>
      </Alert>
      <Alert elevation="elevated" variant="warning">
        <WarningIcon />
        <AlertTitle>elevated</AlertTitle>
        <AlertDescription>elevation.md · panel aislado.</AlertDescription>
      </Alert>
    </div>
  ),
};
