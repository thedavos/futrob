import type { ComponentProps } from "react";
import * as stylex from "@stylexjs/stylex";

import { applyProps, applyStyles, type HostClassName } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";
import { textTone } from "#styles/text-tone";
import { typography } from "#styles/typography";

const styles = stylex.create({
  root: {
    display: "flex",
    width: "100%",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingBlock: "2rem",
    textAlign: "center",
  },
  fill: {
    flexGrow: 1,
    minHeight: 0,
  },
  stack: {
    display: "flex",
    width: "100%",
    maxWidth: "28rem",
    flexDirection: "column",
    alignItems: "center",
    gap: "1.5rem",
  },
  icon: {
    display: "block",
    flexShrink: 0,
    color: colors.mutedForeground,
  },
  copy: {
    display: "flex",
    width: "100%",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.75rem",
  },
  description: {
    maxWidth: "100%",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.75rem",
  },
  footer: {
    marginTop: "0.5rem",
  },
});

export type EmptyStateProps = Omit<ComponentProps<"div">, "className"> & {
  className?: HostClassName;
  /** Stretch to fill the parent so the stack sits in the remaining viewport. */
  fill?: boolean;
};

function EmptyState({ className, style, fill = false, children, ...props }: EmptyStateProps) {
  return (
    <div
      data-fill={fill ? "true" : undefined}
      data-slot="empty-state"
      {...applyProps(className, style, styles.root, fill && styles.fill)}
      {...props}
    >
      <div data-slot="empty-state-stack" {...applyStyles(styles.stack)}>
        {children}
      </div>
    </div>
  );
}

function EmptyStateIcon({
  className,
  style,
  ...props
}: Omit<ComponentProps<"div">, "className"> & { className?: HostClassName }) {
  return (
    <div
      aria-hidden="true"
      data-slot="empty-state-icon"
      {...applyProps(className, style, styles.icon)}
      {...props}
    />
  );
}

function EmptyStateCopy({
  className,
  style,
  ...props
}: Omit<ComponentProps<"div">, "className"> & { className?: HostClassName }) {
  return (
    <div data-slot="empty-state-copy" {...applyProps(className, style, styles.copy)} {...props} />
  );
}

function EmptyStateTitle({
  className,
  style,
  ...props
}: Omit<ComponentProps<"h2">, "className"> & { className?: HostClassName }) {
  return (
    <h2
      data-slot="empty-state-title"
      {...applyProps(className, style, typography.host, typography.heading, textTone.default)}
      {...props}
    />
  );
}

function EmptyStateDescription({
  className,
  style,
  ...props
}: Omit<ComponentProps<"p">, "className"> & { className?: HostClassName }) {
  return (
    <p
      data-slot="empty-state-description"
      {...applyProps(
        className,
        style,
        typography.host,
        typography.subtitle,
        textTone.muted,
        styles.description,
      )}
      {...props}
    />
  );
}

function EmptyStateActions({
  className,
  style,
  ...props
}: Omit<ComponentProps<"div">, "className"> & { className?: HostClassName }) {
  return (
    <div
      data-slot="empty-state-actions"
      {...applyProps(className, style, styles.actions)}
      {...props}
    />
  );
}

function EmptyStateFooter({
  className,
  style,
  ...props
}: Omit<ComponentProps<"p">, "className"> & { className?: HostClassName }) {
  return (
    <p
      data-slot="empty-state-footer"
      {...applyProps(
        className,
        style,
        typography.host,
        typography.caption,
        textTone.muted,
        styles.footer,
      )}
      {...props}
    />
  );
}

export {
  EmptyState,
  EmptyStateActions,
  EmptyStateCopy,
  EmptyStateDescription,
  EmptyStateFooter,
  EmptyStateIcon,
  EmptyStateTitle,
};
