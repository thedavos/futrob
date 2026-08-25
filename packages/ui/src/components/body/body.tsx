import type { ComponentProps } from "react";
import * as stylex from "@stylexjs/stylex";

import { titleWhenTruncated } from "#lib/title-when-truncated";
import { applyProps } from "#styles/apply";
import { textAlign, type TextAlign } from "#styles/text-align";
import { textTone } from "#styles/text-tone";
import { textWeight, type TextWeight } from "#styles/text-weight";
import { typography, type TextTone } from "#styles/typography";

const styles = stylex.create({
  sm: {
    fontSize: "var(--text-xs)",
  },
  lg: {
    fontSize: "var(--text-base)",
  },
});

const sizeStyles = {
  sm: styles.sm,
  lg: styles.lg,
} as const;

export type BodySize = "sm" | "md" | "lg";

export type BodyElement = "p" | "span";

export type BodyProps = ComponentProps<"p"> & {
  as?: BodyElement;
  /** `sm` 12px · `md` 14px (body) · `lg` 16px. Closed; no other sizes. */
  size?: BodySize;
  tone?: TextTone;
  weight?: TextWeight;
  align?: TextAlign;
  /** Cap the measure at 65ch. Off by default. */
  measure?: boolean;
  truncate?: boolean;
};

function Body({
  as: Tag = "p",
  className,
  style,
  size = "md",
  tone = "default",
  weight,
  align = "start",
  measure = false,
  truncate = false,
  title,
  children,
  ...props
}: BodyProps) {
  return (
    <Tag
      data-slot="body"
      data-size={size}
      data-tone={tone}
      data-weight={weight}
      data-align={align}
      data-measure={measure ? "true" : undefined}
      data-truncate={truncate ? "true" : undefined}
      title={titleWhenTruncated(truncate, children, title)}
      {...applyProps(
        className,
        style,
        typography.host,
        typography.body,
        size !== "md" && sizeStyles[size],
        textTone[tone],
        weight && textWeight[weight],
        textAlign[align],
        measure && typography.measure,
        truncate && typography.truncate,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export { Body };
