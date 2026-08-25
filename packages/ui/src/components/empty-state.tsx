import * as React from "react";
import * as stylex from "@stylexjs/stylex";

import { applyHost } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";
import { elevation } from "#styles/elevation";

const styles = stylex.create({
  root: {
    display: "flex",
    minHeight: "14rem",
    width: "100%",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "1rem",
    borderRadius: "var(--corner-lg)",
    backgroundColor: colors.surface,
    padding: "2rem",
    textAlign: "center",
  },
  flat: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.borderStrong,
  },
  icon: {
    display: "flex",
    width: "2.75rem",
    height: "2.75rem",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "var(--corner-full)",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: colors.border,
    backgroundColor: colors.muted,
    color: colors.mutedForeground,
  },
  title: {
    fontSize: "1rem",
    lineHeight: "1.5rem",
    fontWeight: 600,
    color: colors.foreground,
  },
  description: {
    maxWidth: "28rem",
    fontSize: "0.875rem",
    lineHeight: 1.625,
    color: colors.mutedForeground,
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
  },
});

export type EmptyStateVariant = "flat" | "elevated";

type EmptyStateProps = React.ComponentProps<"div"> & {
  variant?: EmptyStateVariant;
};

function EmptyState({ className, style, variant = "flat", ...props }: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      data-variant={variant}
      {...applyHost(
        className,
        style,
        styles.root,
        variant === "elevated" ? elevation.md : styles.flat,
      )}
      {...props}
    />
  );
}

function EmptyStateIcon({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      data-slot="empty-state-icon"
      {...applyHost(className, style, styles.icon)}
      {...props}
    />
  );
}

function EmptyStateTitle({ className, style, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3 data-slot="empty-state-title" {...applyHost(className, style, styles.title)} {...props} />
  );
}

function EmptyStateDescription({ className, style, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="empty-state-description"
      {...applyHost(className, style, styles.description)}
      {...props}
    />
  );
}

function EmptyStateActions({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-state-actions"
      {...applyHost(className, style, styles.actions)}
      {...props}
    />
  );
}

export { EmptyState, EmptyStateActions, EmptyStateDescription, EmptyStateIcon, EmptyStateTitle };
