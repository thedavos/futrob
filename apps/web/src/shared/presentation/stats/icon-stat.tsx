import type { ReactNode } from "react";
import * as stylex from "@stylexjs/stylex";
import { applyStyles, Stat, StatLabel, type Icon, type IconWeight } from "@futrob/ui";

const styles = stylex.create({
  stat: {
    gap: "0.125rem",
  },
  label: {
    display: "flex",
    alignItems: "center",
    gap: "0.25rem",
  },
  icon: {
    width: "0.875rem",
    height: "0.875rem",
  },
});

export function IconStat({
  children,
  icon: MetricIcon,
  iconWeight = "regular",
  label,
  metric,
}: {
  readonly children: ReactNode;
  readonly icon: Icon;
  readonly iconWeight?: IconWeight;
  readonly label: string;
  readonly metric: string;
}) {
  const stat = applyStyles(styles.stat);
  const labelSx = applyStyles(styles.label);
  const icon = applyStyles(styles.icon);
  return (
    <Stat className={stat.className} style={stat.style}>
      <StatLabel className={labelSx.className} style={labelSx.style}>
        <MetricIcon
          aria-hidden="true"
          className={icon.className}
          data-metric-icon={metric}
          style={icon.style}
          weight={iconWeight}
        />
        {label}
      </StatLabel>
      {children}
    </Stat>
  );
}
