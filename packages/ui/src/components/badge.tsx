import * as React from "react";
import * as stylex from "@stylexjs/stylex";

import { applyProps } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";

const styles = stylex.create({
  base: {
    display: "inline-flex",
    minHeight: "1.5rem",
    alignItems: "center",
    gap: "0.25rem",
    borderRadius: "var(--corner-full)",
    borderWidth: 1,
    borderStyle: "solid",
    paddingInline: "0.5rem",
    paddingBlock: "0.125rem",
    fontSize: "0.75rem",
    lineHeight: "1rem",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  neutral: {
    borderColor: colors.border,
    backgroundColor: colors.muted,
    color: colors.mutedForeground,
  },
  primary: {
    borderColor: "color-mix(in oklab, var(--primary) 20%, transparent)",
    backgroundColor: "color-mix(in oklab, var(--primary) 10%, transparent)",
    color: colors.primary,
  },
  approved: {
    borderColor: "color-mix(in oklab, var(--approved) 25%, transparent)",
    backgroundColor: colors.approvedSubtle,
    color: colors.approvedSubtleForeground,
  },
  info: {
    borderColor: "color-mix(in oklab, var(--info) 25%, transparent)",
    backgroundColor: "color-mix(in oklab, var(--info) 10%, transparent)",
    color: colors.info,
  },
  warning: {
    borderColor: "color-mix(in oklab, var(--warning) 25%, transparent)",
    backgroundColor: "color-mix(in oklab, var(--warning) 10%, transparent)",
    color: colors.warning,
  },
  destructive: {
    borderColor: "color-mix(in oklab, var(--danger) 25%, transparent)",
    backgroundColor: "color-mix(in oklab, var(--danger) 10%, transparent)",
    color: colors.danger,
  },
  emphasis: {
    borderColor: "color-mix(in oklab, var(--emphasis) 25%, transparent)",
    backgroundColor: "color-mix(in oklab, var(--emphasis) 10%, transparent)",
    color: colors.emphasis,
  },
  outline: {
    borderColor: colors.borderStrong,
    backgroundColor: "transparent",
    color: colors.foreground,
  },
});

const variantStyles = {
  neutral: styles.neutral,
  primary: styles.primary,
  approved: styles.approved,
  info: styles.info,
  warning: styles.warning,
  destructive: styles.destructive,
  emphasis: styles.emphasis,
  outline: styles.outline,
} as const;

export type BadgeVariant = keyof typeof variantStyles;

function Badge({
  className,
  style,
  variant = "neutral",
  ...props
}: React.ComponentProps<"span"> & { variant?: BadgeVariant }) {
  return (
    <span
      data-slot="badge"
      data-variant={variant}
      {...applyProps(className, style, styles.base, variantStyles[variant])}
      {...props}
    />
  );
}

export { Badge, variantStyles as badgeVariants };
