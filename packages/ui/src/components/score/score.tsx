import type { ComponentProps } from "react";
import * as stylex from "@stylexjs/stylex";

import { titleWhenTruncated } from "#lib/title-when-truncated";
import { applyProps } from "#styles/apply";
import { textTone } from "#styles/text-tone";
import { typography, type TextTone } from "#styles/typography";

const styles = stylex.create({
  start: { textAlign: "start" },
  center: { textAlign: "center" },
  end: { textAlign: "end" },
  table: { fontSize: "0.875rem", lineHeight: "1.25rem" },
});

const alignStyles = {
  start: styles.start,
  center: styles.center,
  end: styles.end,
} as const;

export type ScoreAlign = keyof typeof alignStyles;
/** `table` is the row scale (14/20 px); `default` is the KPI scale and never belongs in a row. */
export type ScoreSize = "default" | "table";
export type ScoreElement = "p" | "span";

export type ScoreProps = ComponentProps<"p"> & {
  as?: ScoreElement;
  align?: ScoreAlign;
  size?: ScoreSize;
  /** `muted` for unavailable values (`—`). Status color lives on `StatValue`. */
  tone?: TextTone;
  truncate?: boolean;
};

/**
 * Tabular numbers that change: match scores, counts, percentages, table cells.
 * Not a second type scale — always `typography.score`.
 */
function Score({
  as: Tag = "p",
  className,
  style,
  align = "start",
  size = "default",
  tone = "default",
  truncate = false,
  title,
  children,
  ...props
}: ScoreProps) {
  return (
    <Tag
      data-slot="score"
      data-align={align}
      data-size={size}
      data-tone={tone}
      data-truncate={truncate ? "true" : undefined}
      title={titleWhenTruncated(truncate, children, title)}
      {...applyProps(
        className,
        style,
        typography.host,
        typography.score,
        textTone[tone],
        alignStyles[align],
        size === "table" && styles.table,
        truncate && typography.truncate,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export { Score };
