import * as React from "react";
import * as stylex from "@stylexjs/stylex";

import { applyProps } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";
import { elevation } from "#styles/elevation";

const styles = stylex.create({
  base: {
    position: "relative",
    display: "grid",
    width: "100%",
    gridTemplateColumns: "auto 1fr",
    alignItems: "start",
    columnGap: "0.75rem",
    rowGap: "0.25rem",
    borderRadius: "var(--corner-lg)",
    padding: "1rem",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    color: colors.foreground,
  },
  defaultVariant: {
    backgroundColor: colors.surface,
  },
  info: {
    backgroundColor: "color-mix(in oklab, var(--info) 8%, transparent)",
  },
  success: {
    backgroundColor: "color-mix(in oklab, var(--success) 8%, transparent)",
  },
  warning: {
    backgroundColor: "color-mix(in oklab, var(--warning) 8%, transparent)",
  },
  destructive: {
    backgroundColor: "color-mix(in oklab, var(--danger) 8%, transparent)",
  },
  flatDefault: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
  },
  flatInfo: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "color-mix(in oklab, var(--info) 25%, transparent)",
  },
  flatSuccess: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "color-mix(in oklab, var(--success) 25%, transparent)",
  },
  flatWarning: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "color-mix(in oklab, var(--warning) 30%, transparent)",
  },
  flatDestructive: {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "color-mix(in oklab, var(--danger) 25%, transparent)",
  },
  title: {
    gridColumnStart: 2,
    fontWeight: 600,
    lineHeight: 1.3,
  },
  description: {
    gridColumnStart: 2,
    lineHeight: 1.625,
    color: colors.mutedForeground,
  },
});

const variantStyles = {
  default: styles.defaultVariant,
  info: styles.info,
  success: styles.success,
  warning: styles.warning,
  destructive: styles.destructive,
} as const;

const flatBorderStyles = {
  default: styles.flatDefault,
  info: styles.flatInfo,
  success: styles.flatSuccess,
  warning: styles.flatWarning,
  destructive: styles.flatDestructive,
} as const;

export type AlertVariant = keyof typeof variantStyles;
export type AlertElevation = "flat" | "elevated";

function Alert({
  className,
  style,
  elevation: elevationProp = "flat",
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & { elevation?: AlertElevation; variant?: AlertVariant }) {
  return (
    <div
      data-slot="alert"
      data-elevation={elevationProp}
      data-variant={variant}
      role="alert"
      {...applyProps(
        className,
        style,
        styles.base,
        variantStyles[variant],
        elevationProp === "elevated" ? elevation.md : flatBorderStyles[variant],
      )}
      {...props}
    />
  );
}

function AlertTitle({ className, style, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-title" {...applyProps(className, style, styles.title)} {...props} />;
}

function AlertDescription({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      {...applyProps(className, style, styles.description)}
      {...props}
    />
  );
}

export { Alert, AlertDescription, AlertTitle };
