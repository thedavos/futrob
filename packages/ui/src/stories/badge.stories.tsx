import type { Meta, StoryObj } from "@storybook/react-vite";
import { CheckCircleIcon, LightningIcon, StarIcon, WarningIcon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { applyProps } from "@futrob/ui";
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

const rowStyles = stylex.create({
  list: {
    display: "grid",
    width: "min(32rem, calc(100vw - 2rem))",
    margin: 0,
    padding: 0,
    listStyle: "none",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    paddingInline: "1rem",
    paddingBlock: "0.75rem",
    borderBottomWidth: { default: 1, ":last-child": 0 },
    borderBottomStyle: "solid",
    borderBottomColor: colors.borderSubtle,
  },
  name: {
    fontSize: "var(--text-sm)",
    fontWeight: "var(--font-weight-semibold)",
    color: colors.foreground,
  },
  badges: { display: "flex", gap: "0.375rem" },
});

const meta = {
  title: "Components/Data display/Badge",
  tags: ["autodocs"],
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
    <div {...applyProps(undefined, undefined, styles.panel)}>
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

/**
 * In dense rows the entity name leads. `neutral` and `outline` sit at 500 so they stay
 * quieter than the name; status variants keep 600 because the status is the message.
 */
export const InDenseRow: Story = {
  render: () => (
    <ul {...applyProps(undefined, undefined, rowStyles.list)}>
      <li {...applyProps(undefined, undefined, rowStyles.row)}>
        <span {...applyProps(undefined, undefined, rowStyles.name)}>Liga Metropolitana</span>
        <span {...applyProps(undefined, undefined, rowStyles.badges)}>
          <Badge variant="neutral">Liga</Badge>
          <Badge variant="outline">Borrador</Badge>
        </span>
      </li>
      <li {...applyProps(undefined, undefined, rowStyles.row)}>
        <span {...applyProps(undefined, undefined, rowStyles.name)}>Copa de Invierno</span>
        <span {...applyProps(undefined, undefined, rowStyles.badges)}>
          <Badge variant="neutral">Copa</Badge>
          <Badge variant="warning">
            <WarningIcon />
            Auditar
          </Badge>
        </span>
      </li>
      <li {...applyProps(undefined, undefined, rowStyles.row)}>
        <span {...applyProps(undefined, undefined, rowStyles.name)}>Nova FC vs Atlas</span>
        <span {...applyProps(undefined, undefined, rowStyles.badges)}>
          <Badge variant="approved">
            <CheckCircleIcon />
            Aprobado
          </Badge>
        </span>
      </li>
    </ul>
  ),
};
