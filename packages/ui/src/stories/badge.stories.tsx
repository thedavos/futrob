import type { Meta, StoryObj } from "@storybook/react-vite";
import { CheckCircleIcon, LightningIcon, StarIcon, WarningIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { applyHost } from "@futrob/ui";
import { colors } from "#styles/tokens.stylex";

import { Badge } from "../components/badge";

const styles = stylex.create({
  panel: {
    display: "flex",
    maxWidth: "42rem",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "0.5rem",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "1.5rem",
  },
});

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
    <div {...applyHost(undefined, undefined, styles.panel)}>
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
