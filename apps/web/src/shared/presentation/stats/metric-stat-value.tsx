import { StatValue, type HostClassName } from "@futrob/ui";

export function MetricStatValue({
  className,
  emptyLabel,
  metric,
  size = "compact",
  value,
}: {
  readonly className?: HostClassName;
  readonly emptyLabel: string;
  readonly metric?: string;
  readonly size?: "compact" | "default";
  readonly value: string | null;
}) {
  return (
    <StatValue
      className={className}
      data-metric={metric}
      size={value === null ? "empty" : size}
      tone={value === null ? "muted" : "default"}
    >
      {value ?? emptyLabel}
    </StatValue>
  );
}
