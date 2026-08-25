import type { Meta, StoryObj } from "@storybook/react-vite";
import * as stylex from "@stylexjs/stylex";
import { applyProps, typography } from "@futrob/ui";
import { colors } from "#styles/tokens.stylex";
import { media } from "#styles/media.stylex";

import { FUTROB_ICON_CATALOG } from "../icons/catalog";

const styles = stylex.create({
  catalog: {
    marginInline: "auto",
    display: "flex",
    width: "100%",
    maxWidth: "64rem",
    flexDirection: "column",
    gap: "1.5rem",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  heading: { color: colors.foreground },
  subtitle: { color: colors.mutedForeground },
  label: { color: colors.foreground },
  grid: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(2, minmax(0, 1fr))",
      [media.lg]: "repeat(3, minmax(0, 1fr))",
    },
    gap: "0.75rem",
  },
  card: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.75rem",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "1rem",
  },
  mark: {
    display: "inline-flex",
    width: "2.5rem",
    height: "2.5rem",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.borderSubtle,
    backgroundColor: colors.muted,
    color: colors.foreground,
  },
  iconSm: {
    width: "1.25rem",
    height: "1.25rem",
  },
  iconXs: {
    width: "0.875rem",
    height: "0.875rem",
  },
  iconInline: {
    width: "1rem",
    height: "1rem",
  },
  iconMd: {
    width: "1.5rem",
    height: "1.5rem",
  },
  iconLg: {
    width: "2rem",
    height: "2rem",
    color: colors.foreground,
  },
  copy: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  name: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color: colors.mutedForeground,
  },
  muted: { color: colors.mutedForeground },
  weights: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "1.5rem",
  },
  weightRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: "1.5rem",
  },
  weightItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.5rem",
  },
  sizes: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: "2rem",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: "1.5rem",
  },
  sizeItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.5rem",
  },
  sizeIcon: { color: colors.foreground },
});

const sizeStyles = {
  "14px · denso": styles.iconXs,
  "16px · input / inline": styles.iconInline,
  "20px · nav / fila": styles.iconSm,
  "24px · énfasis": styles.iconMd,
} as const;

const meta = {
  title: "Primitives/Icons",
  parameters: {
    layout: "padded",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  name: "Catálogo",
  render: () => (
    <div {...applyProps(undefined, undefined, styles.catalog)}>
      <header {...applyProps(undefined, undefined, styles.header)}>
        <h1 {...applyProps(undefined, undefined, typography.heading, styles.heading)}>
          Iconos Phosphor
        </h1>
        <p {...applyProps(undefined, undefined, typography.subtitle, styles.subtitle)}>
          Inventario de los iconos usados en `@futrob/ui` y en la presentación de `apps/web`. Peso
          canónico:{" "}
          <span {...applyProps(undefined, undefined, typography.label, styles.label)}>regular</span>
          .
        </p>
      </header>
      <ul {...applyProps(undefined, undefined, styles.grid)}>
        {FUTROB_ICON_CATALOG.map(({ name, label, usage, Icon }) => (
          <li key={name} {...applyProps(undefined, undefined, styles.card)}>
            <span {...applyProps(undefined, undefined, styles.mark)}>
              <Icon
                aria-hidden="true"
                weight="regular"
                {...applyProps(undefined, undefined, styles.iconSm)}
              />
            </span>
            <span {...applyProps(undefined, undefined, styles.copy)}>
              <span {...applyProps(undefined, undefined, typography.label, styles.label)}>
                {label}
              </span>
              <code {...applyProps(undefined, undefined, typography.caption, styles.name)}>
                {name}
              </code>
              <span {...applyProps(undefined, undefined, typography.caption, styles.muted)}>
                {usage}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  ),
};

export const Weights: Story = {
  name: "Pesos",
  render: () => {
    const sample = FUTROB_ICON_CATALOG.find((entry) => entry.name === "TrophyIcon")!;
    const weights = ["thin", "light", "regular", "bold", "fill", "duotone"] as const;
    return (
      <div {...applyProps(undefined, undefined, styles.weights)}>
        <p {...applyProps(undefined, undefined, typography.caption, styles.muted)}>
          Futrob usa{" "}
          <span {...applyProps(undefined, undefined, typography.label, styles.label)}>regular</span>{" "}
          por defecto. Los demás pesos existen en Phosphor; no los mezcles en UI operativa sin
          decisión de diseño.
        </p>
        <div {...applyProps(undefined, undefined, styles.weightRow)}>
          {weights.map((weight) => (
            <div key={weight} {...applyProps(undefined, undefined, styles.weightItem)}>
              <sample.Icon
                aria-hidden="true"
                weight={weight}
                {...applyProps(undefined, undefined, styles.iconLg)}
              />
              <span {...applyProps(undefined, undefined, typography.caption, styles.muted)}>
                {weight}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  },
};

export const Sizes: Story = {
  name: "Tamaños",
  render: () => {
    const sample = FUTROB_ICON_CATALOG.find((entry) => entry.name === "GameControllerIcon")!;
    const sizes = [
      { key: "14px · denso", label: "14px · denso" },
      { key: "16px · input / inline", label: "16px · input / inline" },
      { key: "20px · nav / fila", label: "20px · nav / fila" },
      { key: "24px · énfasis", label: "24px · énfasis" },
    ] as const;
    return (
      <div {...applyProps(undefined, undefined, styles.sizes)}>
        {sizes.map((size) => (
          <div key={size.key} {...applyProps(undefined, undefined, styles.sizeItem)}>
            <sample.Icon
              aria-hidden="true"
              {...applyProps(undefined, undefined, sizeStyles[size.key], styles.sizeIcon)}
            />
            <span {...applyProps(undefined, undefined, typography.caption, styles.muted)}>
              {size.label}
            </span>
          </div>
        ))}
      </div>
    );
  },
};
