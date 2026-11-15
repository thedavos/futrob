import type { ReactNode } from "react";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Stat, StatGroup, StatLabel, type Icon } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { MetricStatValue } from "@/shared/presentation/stats/metric-stat-value.tsx";

/** Decorative marker beside the label / value / hint stack. */
const KPI_ICON_SIZE = 32;

const styles = stylex.create({
  group: {
    display: "grid",
    width: "100%",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(2, minmax(0, 1fr))",
      [media.lg]: "repeat(4, minmax(0, 1fr))",
    },
    columnGap: "1rem",
    rowGap: "1rem",
  },
  panel: {
    minWidth: 0,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.surface,
    padding: "1rem",
    gap: "0.5rem",
  },
  stack: {
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    alignItems: "center",
    minWidth: 0,
    columnGap: "0.75rem",
  },
  iconCell: {
    gridColumn: "1",
    gridRow: "1 / -1",
    alignSelf: "center",
    color: colors.mutedForeground,
  },
  textCol: {
    gridColumn: "2",
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    gap: "0.25rem",
  },
  icon: {
    display: "block",
    width: "2rem",
    height: "2rem",
  },
});

/** Grid of the profile stat composition (design.md, "Composición Stat perfil"). */
export function ProfileKpiGroup({ children }: { readonly children: ReactNode }) {
  return <StatGroup {...applyStyles(styles.group)}>{children}</StatGroup>;
}

/** Profile tile: muted icon without an island, value and an optional hint with context. */
export function ProfileKpiStat({
  emptyLabel,
  hint,
  icon: Glyph,
  label,
  value,
}: {
  readonly emptyLabel: string;
  readonly hint: ReactNode;
  readonly icon: Icon;
  readonly label: string;
  readonly value: string | null;
}) {
  return (
    <Stat {...applyStyles(styles.panel)}>
      <div {...applyStyles(styles.stack)}>
        <span aria-hidden {...applyStyles(styles.iconCell)}>
          <Glyph aria-hidden size={KPI_ICON_SIZE} {...applyStyles(styles.icon)} />
        </span>
        <div {...applyStyles(styles.textCol)}>
          <StatLabel>{label}</StatLabel>
          <MetricStatValue emptyLabel={emptyLabel} size="default" value={value} />
          {hint}
        </div>
      </div>
    </Stat>
  );
}
