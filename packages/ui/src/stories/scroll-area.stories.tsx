import type { Meta, StoryObj } from "@storybook/react-vite";
import * as stylex from "@stylexjs/stylex";
import { applyHost, typography } from "@futrob/ui";
import { colors } from "#styles/tokens.stylex";

import { ScrollArea, ScrollAreaContent } from "../components/scroll-area";

const styles = stylex.create({
  playground: {
    height: "14rem",
    width: "min(24rem, calc(100vw - 2rem))",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  playgroundContent: {
    display: "grid",
    gap: "0.75rem",
    padding: "1rem",
  },
  foreground: { color: colors.foreground },
  labeled: {
    display: "grid",
    gap: "0.5rem",
  },
  muted: { color: colors.mutedForeground },
  list: {
    height: "16rem",
    width: "min(28rem, calc(100vw - 2rem))",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  listContent: {
    display: "flex",
    flexDirection: "column",
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    paddingInline: "1rem",
    paddingBlock: "0.75rem",
    borderBottomWidth: 1,
    borderBottomStyle: "solid",
    borderBottomColor: colors.border,
  },
  horizontal: {
    width: "min(22rem, calc(100vw - 2rem))",
    borderRadius: "var(--corner-xl)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  horizontalContent: {
    display: "flex",
    width: "max-content",
    gap: "0.75rem",
    padding: "1rem",
  },
  chip: {
    display: "inline-flex",
    height: "2.5rem",
    alignItems: "center",
    borderRadius: "var(--corner-lg)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.muted,
    paddingInline: "0.75rem",
    color: colors.foreground,
  },
});

const meta = {
  title: "Primitives/ScrollArea",
  component: ScrollArea,
  parameters: { layout: "centered" },
} satisfies Meta<typeof ScrollArea>;

export default meta;
type Story = StoryObj<typeof meta>;

const candidateRows = [
  "Jornada 4 · Real Nova vs Atlético Sur · 2-1",
  "Jornada 4 · Club Norte vs Unión Este · 0-0",
  "Jornada 5 · Atlético Sur vs Club Norte · 3-2",
  "Jornada 5 · Unión Este vs Real Nova · 1-1",
  "Jornada 6 · Real Nova vs Club Norte · 4-0",
  "Jornada 6 · Atlético Sur vs Unión Este · 2-2",
  "Jornada 7 · Club Norte vs Unión Este · 1-0",
  "Jornada 7 · Real Nova vs Atlético Sur · 2-3",
];

export const Playground: Story = {
  render: () => (
    <ScrollArea {...applyHost(undefined, undefined, styles.playground)}>
      <ScrollAreaContent {...applyHost(undefined, undefined, styles.playgroundContent)}>
        {candidateRows.map((row) => (
          <p key={row} {...applyHost(undefined, undefined, typography.body, styles.foreground)}>
            {row}
          </p>
        ))}
      </ScrollAreaContent>
    </ScrollArea>
  ),
};

export const VerticalList: Story = {
  render: () => (
    <div {...applyHost(undefined, undefined, styles.labeled)}>
      <p {...applyHost(undefined, undefined, typography.label, styles.muted)}>Candidatos EA</p>
      <ScrollArea {...applyHost(undefined, undefined, styles.list)}>
        <ScrollAreaContent {...applyHost(undefined, undefined, styles.listContent)}>
          {candidateRows.map((row) => (
            <div key={row} {...applyHost(undefined, undefined, styles.row)}>
              <p {...applyHost(undefined, undefined, typography.body, styles.foreground)}>{row}</p>
              <span {...applyHost(undefined, undefined, typography.caption, styles.muted)}>
                Sin usar
              </span>
            </div>
          ))}
        </ScrollAreaContent>
      </ScrollArea>
    </div>
  ),
};

export const HorizontalOverflow: Story = {
  render: () => (
    <ScrollArea {...applyHost(undefined, undefined, styles.horizontal)}>
      <ScrollAreaContent {...applyHost(undefined, undefined, styles.horizontalContent)}>
        {["Vista previa", "Selección", "Historial", "Estadísticas", "Auditoría", "Admin"].map(
          (tab) => (
            <span key={tab} {...applyHost(undefined, undefined, typography.label, styles.chip)}>
              {tab}
            </span>
          ),
        )}
      </ScrollAreaContent>
    </ScrollArea>
  ),
};
