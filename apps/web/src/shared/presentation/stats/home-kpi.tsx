import type { ReactNode } from "react";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Skeleton, Stat, StatGroup, StatLabel, type Icon } from "@futrob/ui";
import { colors } from "@futrob/ui/styles/tokens.stylex";
import { media } from "@futrob/ui/styles/media.stylex";
import { MetricStatValue } from "@/shared/presentation/stats/metric-stat-value.tsx";

const KPI_ICON_SIZE = 32;

const styles = stylex.create({
  group3: {
    display: "grid",
    width: "100%",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [media.sm]: "repeat(3, minmax(0, 1fr))",
    },
    columnGap: "1rem",
    rowGap: "1rem",
  },
  group4: {
    display: "grid",
    width: "100%",
    gridTemplateColumns: {
      default: "repeat(2, minmax(0, 1fr))",
      [media.lg]: "repeat(4, minmax(0, 1fr))",
    },
    columnGap: "1rem",
    rowGap: "1rem",
  },
  panel: {
    height: "100%",
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
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    padding: "0.75rem",
    borderRadius: "var(--corner-full)",
    backgroundColor: "color-mix(in oklab, var(--primary) 20%, transparent)",
    color: colors.primary,
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
  skeleton: {
    height: "5.625rem",
    width: "100%",
    borderRadius: "var(--corner-lg)",
  },
  valueSkeleton: {
    width: "2.5rem",
    height: "2.25rem",
  },
});

export type HomeKpiColumns = 3 | 4;

/** Grid of the Inicio stat composition (design.md, "Composición Stat Inicio"). */
export function HomeKpiGroup({
  children,
  columns = 4,
}: {
  readonly children: ReactNode;
  readonly columns?: HomeKpiColumns;
}) {
  return (
    <StatGroup className={columns === 3 ? styles.group3 : styles.group4}>{children}</StatGroup>
  );
}

/** Loading strip matching `HomeKpiGroup` geometry. */
export function HomeKpiSkeletonGroup({
  columns = 4,
  count = columns,
  label,
}: {
  readonly columns?: HomeKpiColumns;
  readonly count?: number;
  readonly label: string;
}) {
  return (
    <div
      aria-busy="true"
      aria-label={label}
      role="status"
      {...applyStyles(columns === 3 ? styles.group3 : styles.group4)}
    >
      {Array.from({ length: count }, (_, index) => (
        <Skeleton className={styles.skeleton} key={index} />
      ))}
    </div>
  );
}

/** Dashboard tile: lime-tinted icon island + label + primary score (no hint). */
export function HomeKpiStat({
  emptyLabel,
  icon: Glyph,
  label,
  loading = false,
  value,
}: {
  readonly emptyLabel: string;
  readonly icon: Icon;
  readonly label: ReactNode;
  readonly loading?: boolean;
  readonly value: string | null;
}) {
  return (
    <Stat className={styles.panel}>
      <div {...applyStyles(styles.stack)}>
        <span aria-hidden {...applyStyles(styles.iconCell)}>
          <Glyph aria-hidden size={KPI_ICON_SIZE} {...applyStyles(styles.icon)} />
        </span>
        <div {...applyStyles(styles.textCol)}>
          <StatLabel>{label}</StatLabel>
          {loading ? (
            <Skeleton className={styles.valueSkeleton} />
          ) : (
            <MetricStatValue emptyLabel={emptyLabel} size="default" value={value} />
          )}
        </div>
      </div>
    </Stat>
  );
}
