import * as React from "react";
import * as stylex from "@stylexjs/stylex";

import { applyProps } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";
import { typography } from "#styles/typography";

const styles = stylex.create({
  root: {
    display: "flex",
    minWidth: 0,
    flexDirection: "column",
    gap: "0.25rem",
  },
  alignStart: {
    alignItems: "flex-start",
    textAlign: "left",
  },
  alignCenter: {
    alignItems: "center",
    textAlign: "center",
  },
  alignEnd: {
    alignItems: "flex-end",
    textAlign: "right",
  },
  label: {
    color: colors.mutedForeground,
  },
  value: {
    minWidth: 0,
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  sizeCompact: {
    fontSize: "1.25rem",
    lineHeight: 1,
    fontWeight: 600,
    letterSpacing: "-0.02em",
    fontVariantNumeric: "tabular-nums",
  },
  toneDefault: { color: colors.foreground },
  toneMuted: { color: colors.mutedForeground },
  toneSuccess: { color: colors.success },
  toneWarning: { color: colors.warning },
  toneError: { color: colors.danger },
  hint: {
    color: colors.mutedForeground,
  },
  group: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-start",
    columnGap: "2rem",
    rowGap: "1.25rem",
  },
});

const alignStyles = {
  start: styles.alignStart,
  center: styles.alignCenter,
  end: styles.alignEnd,
} as const;

const sizeStyles = {
  default: typography.score,
  compact: styles.sizeCompact,
  empty: typography.caption,
} as const;

const toneStyles = {
  default: styles.toneDefault,
  muted: styles.toneMuted,
  success: styles.toneSuccess,
  warning: styles.toneWarning,
  error: styles.toneError,
} as const;

export type StatAlign = keyof typeof alignStyles;
export type StatValueSize = keyof typeof sizeStyles;
export type StatValueTone = keyof typeof toneStyles;

type StatProps = React.ComponentProps<"div"> & {
  align?: StatAlign;
};

function Stat({ className, style, align = "start", ...props }: StatProps) {
  return (
    <div
      data-slot="stat"
      data-align={align}
      {...applyProps(className, style, styles.root, alignStyles[align])}
      {...props}
    />
  );
}

function StatLabel({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stat-label"
      {...applyProps(className, style, typography.label, styles.label)}
      {...props}
    />
  );
}

type StatValueProps = React.ComponentProps<"div"> & {
  size?: StatValueSize;
  tone?: StatValueTone;
};

function StatValue({
  className,
  style,
  size = "default",
  tone = "default",
  ...props
}: StatValueProps) {
  return (
    <div
      data-slot="stat-value"
      data-size={size}
      data-tone={tone}
      {...applyProps(className, style, styles.value, sizeStyles[size], toneStyles[tone])}
      {...props}
    />
  );
}

function StatHint({ className, style, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="stat-hint"
      {...applyProps(className, style, typography.caption, styles.hint)}
      {...props}
    />
  );
}

function StatGroup({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stat-group"
      role="group"
      {...applyProps(className, style, styles.group)}
      {...props}
    />
  );
}

export { Stat, StatGroup, StatHint, StatLabel, StatValue };
export type { StatProps, StatValueProps };
