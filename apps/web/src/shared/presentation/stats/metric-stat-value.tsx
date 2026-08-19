import { StatValue } from "@futrob/ui";

export function MetricStatValue({
  emptyLabel,
  metric,
  size = "compact",
  value,
}: {
  readonly emptyLabel: string;
  readonly metric?: string;
  readonly size?: "compact" | "default";
  readonly value: string | null;
}) {
  return (
    <StatValue
      data-metric={metric}
      size={value === null ? "empty" : size}
      tone={value === null ? "muted" : "default"}
    >
      {value ?? emptyLabel}
    </StatValue>
  );
}
