import * as React from "react";
import * as stylex from "@stylexjs/stylex";

import { applyProps, type HostClassName } from "#styles/apply";
import { colors } from "#styles/tokens.stylex";

const styles = stylex.create({
  root: {
    display: "flex",
    flexShrink: 0,
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: "0.5rem",
    rowGap: "0.5rem",
    borderTopWidth: 1,
    borderTopStyle: "solid",
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingInline: "1rem",
    paddingBlock: "0.75rem",
    paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))",
  },
  start: {
    marginRight: "auto",
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    gap: "0.5rem",
  },
  end: {
    display: "flex",
    flexShrink: 0,
    alignItems: "center",
    gap: "0.5rem",
  },
});

function ActionBar({
  className,
  style,
  ...props
}: Omit<React.ComponentProps<"div">, "className"> & { readonly className?: HostClassName }) {
  return <div data-slot="action-bar" {...applyProps(className, style, styles.root)} {...props} />;
}

function ActionBarStart({
  className,
  style,
  ...props
}: Omit<React.ComponentProps<"div">, "className"> & { readonly className?: HostClassName }) {
  return (
    <div data-slot="action-bar-start" {...applyProps(className, style, styles.start)} {...props} />
  );
}

function ActionBarEnd({
  className,
  style,
  ...props
}: Omit<React.ComponentProps<"div">, "className"> & { readonly className?: HostClassName }) {
  return (
    <div data-slot="action-bar-end" {...applyProps(className, style, styles.end)} {...props} />
  );
}

export { ActionBar, ActionBarEnd, ActionBarStart };
