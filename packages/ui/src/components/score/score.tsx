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
});

const alignStyles = {
  start: styles.start,
  center: styles.center,
  end: styles.end,
} as const;

export type ScoreAlign = keyof typeof alignStyles;
export type ScoreElement = "p" | "span";

export type ScoreProps = ComponentProps<"p"> & {
  as?: ScoreElement;
  align?: ScoreAlign;
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
        truncate && typography.truncate,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export { Score };
