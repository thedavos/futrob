import * as React from "react";
import * as stylex from "@stylexjs/stylex";

import { applyProps, type HostClassName } from "#styles/apply";
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
  triple: {
    display: "grid",
    width: "100%",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    columnGap: "0.75rem",
    rowGap: "0.75rem",
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
export type StatGroupLayout = "wrap" | "triple";

type StatProps = Omit<React.ComponentProps<"div">, "className"> & {
  align?: StatAlign;
  className?: HostClassName;
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

function StatLabel({
  className,
  style,
  ...props
}: Omit<React.ComponentProps<"div">, "className"> & { className?: HostClassName }) {
  return (
    <div
      data-slot="stat-label"
      {...applyProps(className, style, typography.label, styles.label)}
      {...props}
    />
  );
}

type StatValueProps = Omit<React.ComponentProps<"div">, "className"> & {
  className?: HostClassName;
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

function StatHint({
  className,
  style,
  ...props
}: Omit<React.ComponentProps<"p">, "className"> & { className?: HostClassName }) {
  return (
    <p
      data-slot="stat-hint"
      {...applyProps(className, style, typography.caption, styles.hint)}
      {...props}
    />
  );
}

type StatGroupProps = Omit<React.ComponentProps<"div">, "className"> & {
  className?: HostClassName;
  layout?: StatGroupLayout;
};

function StatGroup({ className, style, layout = "wrap", ...props }: StatGroupProps) {
  return (
    <div
      data-slot="stat-group"
      data-layout={layout}
      role="group"
      {...applyProps(className, style, styles.group, layout === "triple" && styles.triple)}
      {...props}
    />
  );
}

export { Stat, StatGroup, StatHint, StatLabel, StatValue };
export type { StatGroupProps, StatProps, StatValueProps };
