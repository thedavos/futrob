import type { ReactNode } from "react";
import { Stat, StatLabel, type Icon, type IconWeight } from "@futrob/ui";

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
  return (
    <Stat className="gap-0.5">
      <StatLabel className="flex items-center gap-1">
        <MetricIcon
          aria-hidden="true"
          className="size-3.5"
          data-metric-icon={metric}
          weight={iconWeight}
        />
        {label}
      </StatLabel>
      {children}
    </Stat>
  );
}
